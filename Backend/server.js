const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");
const { parseInventoryCsv } = require("./csv");
const {
  getPublicSupportDetails,
  isSupportEmailConfigured,
  sendResetEmail,
  sendSupportRequest,
} = require("./mailHandler");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.text({ type: ["text/csv", "application/csv"], limit: "1.5mb" }));
app.use(express.json({ limit: "1.5mb" }));

db.checkDatabaseConnection();

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT = process.env.NOMINATIM_USER_AGENT;
const NOMINATIM_MIN_INTERVAL_MS = 1100;
const SEARCH_CACHE_TTL_MS = 60_000;

const storeSearchCache = new Map();
const supportRequestAttempts = new Map();
let nextNominatimRequestAt = 0;
const SUPPORT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const SUPPORT_RATE_LIMIT_MAX = 3;

function requireDatabase(req, res, next) {
  const { dbReady, dbMessage } = db.getStatus();

  if (!dbReady) {
    return res.status(503).json({
      message: "Database is not ready yet.",
      detail: dbMessage
    });
  }
  next();
}

async function requireUser(req, res, next) {
  const authorization = req.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) return res.status(401).json({ message: "Sign in to continue." });

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await db.findUserBySession(tokenHash);

    if (!user) return res.status(401).json({ message: "Your session has expired. Please sign in again." });

    req.user = user;
    next();
  } catch (error) {
    console.error("Session validation error:", error);
    res.status(500).json({ message: "Unable to validate your session." });
  }
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getModeratorEmails() {
  return new Set(
    (process.env.MODERATOR_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isModeratorEmail(email) {
  return getModeratorEmails().has(String(email || "").trim().toLowerCase());
}

function requireModerator(req, res, next) {
  if (!isModeratorEmail(req.user?.email)) {
    return res.status(403).json({ message: "Moderator access is required." });
  }
  next();
}

async function saveSession(userId) {
  const token = createSessionToken();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await db.createUserSession(userId, tokenHash);
  return token;
}

function waitForNominatimSlot() {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextNominatimRequestAt);

  nextNominatimRequestAt = scheduledAt + NOMINATIM_MIN_INTERVAL_MS;

  return new Promise((resolve) => {
    setTimeout(resolve, scheduledAt - now);
  });
}

function buildViewbox(latitude, longitude, radiusKm = 10) {
  const latitudeDelta = radiusKm / 111;
  const longitudeDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

  const west = longitude - longitudeDelta;
  const north = latitude + latitudeDelta;
  const east = longitude + longitudeDelta;
  const south = latitude - latitudeDelta;

  return `${west},${north},${east},${south}`;
}

app.get("/api/health", (req, res) => {
  const { dbReady, dbMessage } = db.getStatus();
  res.json({ status: "ok", dbReady, message: dbMessage });
});

app.get("/api/support/contact", (req, res) => {
  res.json(getPublicSupportDetails());
});

app.post("/api/support/contact", async (req, res) => {
  const { name, email, category, orderReference = "", message, website = "" } = req.body || {};
  if (typeof website !== "string" || website.length > 200) {
    return res.status(400).json({ message: "Invalid support request." });
  }
  if (website.trim()) {
    return res.status(400).json({ message: "Invalid support request." });
  }
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({ message: "Enter your name (up to 100 characters)." });
  }
  if (typeof email !== "string" || email.trim().length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ message: "Enter a valid email address so our team can reply." });
  }
  if (typeof category !== "string" ||
      !["order", "peer_marketplace", "store_account", "account_security", "other"].includes(category)) {
    return res.status(400).json({ message: "Choose a support topic." });
  }
  if (typeof orderReference !== "string" || orderReference.trim().length > 100) {
    return res.status(400).json({ message: "Order or reference must be 100 characters or fewer." });
  }
  if (typeof message !== "string" || message.trim().length < 10 || message.trim().length > 5000) {
    return res.status(400).json({ message: "Write a message between 10 and 5,000 characters." });
  }
  if (!isSupportEmailConfigured()) {
    return res.status(503).json({
      message: "Customer support email is not available yet. Please try again later.",
    });
  }

  const now = Date.now();
  const requestKey = req.ip || req.socket.remoteAddress || "unknown";
  const previousAttempt = supportRequestAttempts.get(requestKey);
  if (previousAttempt && now - previousAttempt.startedAt < SUPPORT_RATE_LIMIT_WINDOW_MS) {
    if (previousAttempt.count >= SUPPORT_RATE_LIMIT_MAX) {
      return res.status(429).json({
        message: "You’ve sent several requests recently. Please wait a little before trying again.",
      });
    }
    previousAttempt.count += 1;
  } else {
    supportRequestAttempts.set(requestKey, { startedAt: now, count: 1 });
  }
  for (const [key, attempt] of supportRequestAttempts) {
    if (now - attempt.startedAt >= SUPPORT_RATE_LIMIT_WINDOW_MS) {
      supportRequestAttempts.delete(key);
    }
  }

  try {
    await sendSupportRequest({
      name: name.trim(),
      email: email.trim(),
      category,
      orderReference: orderReference.trim(),
      message: message.trim(),
    });
    res.status(202).json({ message: "Your message is on its way. Our support team will get back to you by email." });
  } catch (error) {
    if (error.code === "SUPPORT_NOT_CONFIGURED") {
      return res.status(503).json({
        message: "Customer support email is not available yet. Please try again later.",
      });
    }
    console.error("Send customer support request error:", error);
    res.status(502).json({ message: "We couldn’t send your message just now. Please try again later." });
  }
});

app.get("/api/trends/products", requireDatabase, async (req, res) => {
  if (req.query.area !== undefined && typeof req.query.area !== "string") {
    return res.status(400).json({ message: "Enter one area to search for local trends." });
  }
  const area = typeof req.query.area === "string" ? req.query.area.trim().replace(/\s+/g, " ") : "";
  if (area.length > 100) {
    return res.status(400).json({ message: "Area must be 100 characters or fewer." });
  }

  try {
    const products = await db.getTrendingProducts({ area, limit: 12 });
    res.json({ products, area, periodDays: 7 });
  } catch (error) {
    console.error("Get product trends error:", error);
    res.status(500).json({ message: "Unable to load product trends." });
  }
});

app.post("/api/trends/events", requireDatabase, async (req, res) => {
  const { productId, eventType, area = "", visitorId } = req.body || {};
  const numericProductId = Number(productId);
  const normalizedArea = typeof area === "string" ? area.trim().replace(/\s+/g, " ") : null;

  if (!Number.isInteger(numericProductId) || numericProductId <= 0) {
    return res.status(400).json({ message: "Choose a valid product." });
  }
  if (!["search", "view"].includes(eventType)) {
    return res.status(400).json({ message: "Choose a valid trend event." });
  }
  if (normalizedArea === null || normalizedArea.length > 100) {
    return res.status(400).json({ message: "Area must be 100 characters or fewer." });
  }
  if (typeof visitorId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId)) {
    return res.status(400).json({ message: "A valid anonymous visitor identifier is required." });
  }

  try {
    const visitorHash = crypto.createHash("sha256").update(visitorId).digest("hex");
    await db.recordProductTrend({
      productId: numericProductId,
      eventType,
      area: normalizedArea,
      visitorHash,
    });
    res.status(202).json({ message: "Product interest recorded." });
  } catch (error) {
    console.error("Record product trend error:", error);
    res.status(500).json({ message: "Unable to record product interest." });
  }
});

app.get("/api/stores/search", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lng);
  const location = typeof req.query.location === "string" ? req.query.location.trim() : "";

  if (query.length < 2) {
    return res.status(400).json({
      message: "Please enter at least two characters to search for stores."
    });
  }

  if (!NOMINATIM_USER_AGENT) return res.status(500).json({ message: "Nominatim user agent is not configured on the server." });

  const hasValidLocation =
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180;

  const locationAwareQuery = !hasValidLocation && location ? `${query} in ${location}` : query;

  const searchParams = new URLSearchParams({
    q: locationAwareQuery,
    format: "jsonv2",
    limit: "10",
    addressdetails: "1",
    extratags: "1",
    namedetails: "1",
  });

  if (hasValidLocation) {
    searchParams.set("viewbox", buildViewbox(latitude, longitude));
    searchParams.set("bounded", "1");
  }

  const cacheKey = searchParams.toString();
  const cachedResult = storeSearchCache.get(cacheKey);

  if (cachedResult && Date.now() - cachedResult.createdAt < SEARCH_CACHE_TTL_MS) {
    return res.json({
      source: "OpenStreetMap",
      cached: true,
      stores: cachedResult.stores,
    });
  }

  try {
    await waitForNominatimSlot();

    const response = await fetch(`${NOMINATIM_BASE_URL}?${searchParams}`, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) throw new Error(`Nominatim returned status ${response.status}`);

    const places = await response.json();

    const stores = places.map((place) => ({
      id: `osm-${place.osm_type}-${place.osm_id}`,
      name: place.namedetails?.name || place.display_name.split(",")[0] || "Unnamed place",
      address: place.display_name,
      latitude: Number(place.lat),
      longitude: Number(place.lon),
      category: place.category,
      type: place.type,
      website: place.extratags?.website || place.extratags?.["contact:website"] || null,
      phone: place.extratags?.phone || place.extratags?.["contact:phone"] || null,
      openingHours: place.extratags?.opening_hours || null,
    }));

    storeSearchCache.set(cacheKey, {
      createdAt: Date.now(),
      stores,
    });

    res.json({
      source: "OpenStreetMap",
      cached: false,
      stores,
    });
  } catch (error) {
    console.error("Store search error:", error.message);
    res.status(502).json({ message: "Unable to search for nearby stores right now." });
  }
});

app.post("/api/auth/signup", requireDatabase, async (req, res) => {
  const { username, email, password } = req.body || {};
  const accountType = "buyer";

  if (!username || !email || !password) return res.status(400).json({ message: "Username, email, and password are required." });
  if (typeof username !== "string" || username.trim().length > 100) {
    return res.status(400).json({ message: "Username must be 100 characters or fewer." });
  }
  if (typeof email !== "string" || email.trim().length > 255) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();
    const userExists = await db.findUserByEmailOrUsername(normalizedEmail, normalizedUsername);
    if (userExists) return res.status(409).json({ message: "A user with that email or username already exists." });

    const user = await db.createUser(normalizedUsername, normalizedEmail, password, accountType);
    const token = await saveSession(user.id);

    res.status(201).json({
      message: "User created successfully",
      user: { ...user, isModerator: isModeratorEmail(user.email) },
      token
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Unable to complete signup.", error: error.message });
  }
});

app.post("/api/auth/login", requireDatabase, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

  try {
    const user = await db.findUserByCredentials(String(email).trim().toLowerCase(), password);
    if (!user) return res.status(401).json({ message: "Invalid email or password." });
    const device = (req.get("user-agent") || "Unknown device").slice(0, 255);

    await db.updateLastLogin(user.id, device);
    const token = await saveSession(user.id);

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        accountType: user.accountType,
        isModerator: isModeratorEmail(user.email),
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Unable to complete login.", error: error.message });
  }
});

app.post("/api/auth/logout", requireDatabase, requireUser, async (req, res) => {
  const token = req.get("authorization").slice("Bearer ".length).trim();

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await db.revokeUserSession(tokenHash);
    res.json({ message: "You have been signed out." });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Unable to sign out right now." });
  }
});

app.post("/api/auth/become-seller", requireDatabase, requireUser, async (req, res) => {
  try {
    if (req.user.accountType === "seller") {
      return res.json({ message: "Your seller profile is ready.", accountType: "seller" });
    }

    await db.upgradeUserToSeller(req.user.id);
    res.json({
      message: "Your seller profile is ready.",
      accountType: "seller",
    });
  } catch (error) {
    console.error("Seller account upgrade error:", error);
    res.status(500).json({ message: "Unable to set up your seller profile." });
  }
});

app.get("/api/account/settings", requireDatabase, requireUser, async (req, res) => {
  try {
    const settings = await db.getAccountSettings(req.user.id);
    if (!settings) return res.status(404).json({ message: "Your HomeX account could not be found." });
    res.json(settings);
  } catch (error) {
    console.error("Get account settings error:", error);
    res.status(500).json({ message: "Unable to load your settings." });
  }
});

app.put("/api/account/settings", requireDatabase, requireUser, async (req, res) => {
  const { username, preferredArea, showContactPhone } = req.body || {};
  const normalizedUsername = typeof username === "string" ? username.trim() : "";
  const normalizedArea = typeof preferredArea === "string"
    ? preferredArea.trim().replace(/\s+/g, " ")
    : null;
  if (!normalizedUsername || normalizedUsername.length > 100) {
    return res.status(400).json({ message: "Enter a display name up to 100 characters long." });
  }
  if (normalizedArea === null || normalizedArea.length > 100) {
    return res.status(400).json({ message: "Enter a preferred area up to 100 characters long." });
  }
  if (typeof showContactPhone !== "boolean") {
    return res.status(400).json({ message: "Choose whether your phone number can be shown on your listings." });
  }

  try {
    const settings = await db.updateAccountSettings(req.user.id, {
      username: normalizedUsername,
      preferredArea: normalizedArea,
      showContactPhone,
    });
    res.json({ message: "Your HomeX preferences are saved.", settings });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "That display name is already in use. Try another one." });
    }
    console.error("Update account settings error:", error);
    res.status(500).json({ message: "Unable to save your settings." });
  }
});

app.post("/api/account/password", requireDatabase, requireUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || !currentPassword) {
    return res.status(400).json({ message: "Enter your current password." });
  }
  if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 200) {
    return res.status(400).json({ message: "Your new password must be between 8 and 200 characters." });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ message: "Choose a new password that is different from your current one." });
  }

  try {
    const authorization = req.get("authorization") || "";
    const token = authorization.slice("Bearer ".length).trim();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const updated = await db.changeAccountPassword(
      req.user.id,
      tokenHash,
      currentPassword,
      newPassword
    );
    if (!updated) return res.status(401).json({ message: "Your current password doesn’t match." });
    res.json({ message: "Password updated. Other HomeX sessions have been signed out." });
  } catch (error) {
    console.error("Change account password error:", error);
    res.status(500).json({ message: "Unable to update your password." });
  }
});

app.get("/api/marketplace/listings", requireDatabase, async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
  const location = typeof req.query.location === "string" ? req.query.location.trim().slice(0, 100) : "";
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0    ? Math.min(requestedLimit, 40)    : 24;
  const allowedCategories = new Set([
    "furniture", "appliances", "entertainment", "kitchenware", "home-decor",
    "seasonal", "textiles", "lighting", "outdoor", "pets", "fitness",
  ]);

  if (category && !allowedCategories.has(category)) {
    return res.status(400).json({ message: "Choose a valid home category." });
  }

  try {
    const listings = await db.getMarketplaceListings({ query, category, location, limit });
    res.json({ listings });
  } catch (error) {
    console.error("Get marketplace listings error:", error);
    res.status(500).json({ message: "Unable to load neighborhood finds." });
  }
});

app.post("/api/marketplace/listings/:listingId/reports", requireDatabase, requireUser, async (req, res) => {
  const listingId = Number(req.params.listingId);
  const { reason, details = "" } = req.body || {};
  const allowedReasons = new Set([
    "scam", "counterfeit", "misleading", "prohibited", "suspicious_contact", "other",
  ]);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({ message: "Choose a valid listing." });
  }
  if (!allowedReasons.has(reason)) {
    return res.status(400).json({ message: "Choose a reason for your report." });
  }
  if (typeof details !== "string" || details.trim().length > 1000) {
    return res.status(400).json({ message: "Additional details must be 1,000 characters or fewer." });
  }

  try {
    const created = await db.createMarketplaceListingReport(req.user.id, {
      listingId,
      reason,
      details: details.trim(),
    });
    if (!created) {
      return res.status(404).json({ message: "This listing can no longer be reported." });
    }
    res.status(201).json({ message: "Thanks for helping keep HomeX safe. Our team will review your report." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "You’ve already reported this listing." });
    }
    console.error("Create marketplace listing report error:", error);
    res.status(500).json({ message: "Unable to submit your report right now." });
  }
});

app.get(
  "/api/moderation/listing-reports",
  requireDatabase,
  requireUser,
  requireModerator,
  async (req, res) => {
    try {
      const reports = await db.getPendingMarketplaceListingReports();
      res.json({ reports });
    } catch (error) {
      console.error("Get marketplace moderation reports error:", error);
      res.status(500).json({ message: "Unable to load listing reports." });
    }
  }
);

app.get(
  "/api/moderation/merchant-applications",
  requireDatabase,
  requireUser,
  requireModerator,
  async (req, res) => {
    try {
      const applications = await db.getPendingMerchantApplications();
      res.json({ applications });
    } catch (error) {
      console.error("Get merchant applications error:", error);
      res.status(500).json({ message: "Unable to load merchant applications." });
    }
  }
);

app.patch(
  "/api/moderation/merchant-applications/:applicationId",
  requireDatabase,
  requireUser,
  requireModerator,
  async (req, res) => {
    const applicationId = Number(req.params.applicationId);
    const { action } = req.body || {};
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({ message: "Choose a valid application." });
    }
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Choose approve or reject." });
    }

    try {
      const result = await db.reviewMerchantApplication(applicationId, req.user.id, action);
      if (result === "not_found") return res.status(404).json({ message: "Application not found." });
      if (result === "already_reviewed") {
        return res.status(409).json({ message: "This application has already been reviewed." });
      }
      res.json({
        message: result === "approved"
          ? "Merchant application approved and store access granted."
          : "Merchant application rejected.",
      });
    } catch (error) {
      console.error("Review merchant application error:", error);
      res.status(500).json({ message: "Unable to review this application." });
    }
  }
);

app.patch(
  "/api/moderation/listing-reports/:reportId",
  requireDatabase,
  requireUser,
  requireModerator,
  async (req, res) => {
    const reportId = Number(req.params.reportId);
    const { action } = req.body || {};
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ message: "Choose a valid report." });
    }
    if (!["dismiss", "remove_listing"].includes(action)) {
      return res.status(400).json({ message: "Choose dismiss or remove_listing." });
    }

    try {
      const result = await db.reviewMarketplaceListingReport(reportId, req.user.id, action);
      if (result === "not_found") return res.status(404).json({ message: "Report not found." });
      if (result === "already_reviewed") {
        return res.status(409).json({ message: "This report has already been reviewed." });
      }
      res.json({
        message: result === "listing_removed"
          ? "Listing removed and its open reports resolved."
          : "Report dismissed.",
      });
    } catch (error) {
      console.error("Review marketplace listing report error:", error);
      res.status(500).json({ message: "Unable to review this report right now." });
    }
  }
);

app.get("/api/marketplace/my-listings", requireDatabase, requireUser, async (req, res) => {
  try {
    const listings = await db.getSellerListings(req.user.id);
    res.json({ listings });
  } catch (error) {
    console.error("Get seller listings error:", error);
    res.status(500).json({ message: "Unable to load your listings." });
  }
});

app.post("/api/marketplace/listings", requireDatabase, requireUser, async (req, res) => {
  const {
    title,
    description,
    category,
    price,
    condition,
    neighborhood,
    imageUrl = "",
    contactPhone = "",
  } = req.body || {};
  const allowedCategories = new Set([
    "furniture", "appliances", "entertainment", "kitchenware", "home-decor",
    "seasonal", "textiles", "lighting", "outdoor", "pets", "fitness",
  ]);
  const allowedConditions = new Set(["like_new", "good", "well_loved"]);
  const numericPrice = Number(price);

  if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
    return res.status(400).json({ message: "Give your listing a title of 1–120 characters." });
  }
  if (typeof description !== "string" || !description.trim() || description.trim().length > 2000) {
    return res.status(400).json({ message: "Add a description of up to 2,000 characters." });
  }
  if (!allowedCategories.has(category)) {
    return res.status(400).json({ message: "Choose a valid home category." });
  }
  if (!Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice > 100_000_000) {
    return res.status(400).json({ message: "Enter a price greater than zero." });
  }
  if (!allowedConditions.has(condition)) {
    return res.status(400).json({ message: "Choose the item's condition." });
  }
  if (typeof neighborhood !== "string" || !neighborhood.trim() || neighborhood.trim().length > 100) {
    return res.status(400).json({ message: "Add a neighborhood or general area (up to 100 characters)." });
  }
  if (typeof imageUrl !== "string" || imageUrl.length > 500) {
    return res.status(400).json({ message: "Image URL must be 500 characters or fewer." });
  }
  if (imageUrl.trim()) {
    try {
      const parsedImageUrl = new URL(imageUrl.trim());
      if (!["https:", "http:"].includes(parsedImageUrl.protocol)) throw new Error("Invalid protocol");
    } catch {
      return res.status(400).json({ message: "Enter a valid image URL, or leave it blank." });
    }
  }
  if (typeof contactPhone !== "string" || contactPhone.length > 30 ||
    (contactPhone.trim() && !/^\+?[\d\s()-]{7,20}$/.test(contactPhone.trim()))) {
    return res.status(400).json({ message: "Enter a valid contact phone number, or leave it blank." });
  }

  try {
    const listingId = await db.createMarketplaceListing(req.user.id, {
      title: title.trim(),
      description: description.trim(),
      category,
      price: numericPrice,
      condition,
      neighborhood: neighborhood.trim(),
      imageUrl: imageUrl.trim() || null,
      contactPhone: contactPhone.trim() || null,
    });
    res.status(201).json({ message: "Your find is now listed.", listingId });
  } catch (error) {
    console.error("Create marketplace listing error:", error);
    res.status(500).json({ message: "Unable to publish your listing." });
  }
});

app.patch("/api/marketplace/listings/:listingId/status", requireDatabase, requireUser, async (req, res) => {
  const listingId = Number(req.params.listingId);
  const { status } = req.body || {};
  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({ message: "Invalid listing." });
  }
  if (!["active", "sold"].includes(status)) {
    return res.status(400).json({ message: "Choose active or sold status." });
  }

  try {
    const updated = await db.updateMarketplaceListingStatus(listingId, req.user.id, status);
    if (!updated) return res.status(404).json({ message: "Listing not found." });
    res.json({ message: status === "sold" ? "Listing marked as sold." : "Listing is active again." });
  } catch (error) {
    console.error("Update marketplace listing error:", error);
    res.status(500).json({ message: "Unable to update your listing." });
  }
});

app.get("/api/merchant/dashboard", requireDatabase, requireUser, async (req, res) => {
  try {
    const dashboard = await db.getMerchantDashboard(req.user.id);
    res.json(dashboard);
  } catch (error) {
    console.error("Get merchant dashboard error:", error);
    res.status(500).json({ message: "Unable to load your merchant workspace." });
  }
});

app.post("/api/merchant/applications", requireDatabase, requireUser, async (req, res) => {
  const { storeName, description, address, phone } = req.body || {};
  const fields = [
    ["store name", storeName, 150],
    ["store description", description, 2000],
    ["store address", address, 255],
    ["store phone", phone, 30],
  ];
  for (const [label, value, maxLength] of fields) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
      return res.status(400).json({ message: `Enter a ${label} (up to ${maxLength} characters).` });
    }
  }
  if (!/^\+?[\d\s()-]{7,20}$/.test(phone.trim())) {
    return res.status(400).json({ message: "Enter a valid store phone number." });
  }

  try {
    const applicationId = await db.createMerchantApplication(req.user.id, {
      storeName: storeName.trim(),
      description: description.trim(),
      address: address.trim(),
      phone: phone.trim(),
    });
    if (applicationId === "pending_exists") {
      return res.status(409).json({ message: "You already have a merchant application awaiting review." });
    }
    if (applicationId === "already_managed") {
      return res.status(409).json({ message: "You already manage this store in your HomeX workspace." });
    }
    res.status(201).json({
      message: "Application submitted for review. We’ll let you know when your store workspace is ready.",
      applicationId,
    });
  } catch (error) {
    console.error("Submit merchant application error:", error);
    res.status(500).json({ message: "Unable to submit your merchant application." });
  }
});

app.post("/api/merchant/stores/:storeId/inventory/import", requireDatabase, requireUser, async (req, res) => {
  const storeId = Number(req.params.storeId);
  if (!Number.isInteger(storeId) || storeId <= 0) {
    return res.status(400).json({ message: "Choose a valid store." });
  }
  if (typeof req.body !== "string") {
    return res.status(400).json({ message: "Upload a CSV file using the provided inventory template." });
  }

  let products;
  try {
    products = parseInventoryCsv(req.body);
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "The CSV file could not be read.",
    });
  }

  try {
    const result = await db.importMerchantInventory(req.user.id, storeId, products);
    if (result === "forbidden") {
      return res.status(403).json({ message: "You don’t have permission to update inventory for this store." });
    }
    res.json({
      message: `Inventory updated: ${result.inserted} new SKU${result.inserted === 1 ? "" : "s"} and ${result.updated} existing SKU${result.updated === 1 ? "" : "s"}.`,
      ...result,
    });
  } catch (error) {
    console.error("Import merchant inventory error:", error);
    res.status(500).json({ message: "Unable to import inventory. No rows were saved." });
  }
});

app.post("/api/auth/check-email", requireDatabase, async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const userId = await db.getUserIdByEmail(email);
    if (userId === null) return res.status(404).json({ message: "Email not found" });

    res.json({ message: "Email exists", userId });
  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).json({ message: "Unable to check email.", error: error.message });
  }
});

app.post("/api/auth/reset-password", requireDatabase, async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ message: "Token and password are required." });
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  try {
    const result = await db.resetPassword(token, newPassword);
    if (result === "invalid") return res.status(404).json({ message: "Invalid token." });
    if (result === "expired") return res.status(400).json({ message: "Token expired." });

    res.json({ message: "Password reset successful." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Unable to reset password.", error: error.message });
  }
});

app.post("/api/auth/request-reset", requireDatabase, async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const userId = await db.getUserIdByEmail(email);
    if (userId === null) return res.status(404).json({ message: "Email not found" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const device = (req.get("user-agent") || "Unknown device").slice(0, 255);

    await db.createResetToken(userId, token, expiresAt, device);

    await sendResetEmail(email, token);

    res.json({ message: "Password reset email sent." });
  } catch (err) {
    console.error("Request reset error:", err);
    res.status(500).json({ message: "Unable to send reset email.", error: err.message });
  }
})

app.get("/api/products/department/:departmentSlug", requireDatabase, async (req, res) => {
  const departmentSlug = req.params.departmentSlug?.trim();

  if (!departmentSlug) return res.status(400).json({ message: "Department is required." });

  try {
    const products = await db.getProductsByDepartment(departmentSlug);

    res.json({ department: departmentSlug, products });
  } catch (error) {
    console.error("Get department products error:", error);

    res.status(500).json({
      message: "Unable to fetch department products.",
      error: error.message,
    });
  }
});

app.get("/api/products/:productId", requireDatabase, async (req, res) => {
  const productId = Number(req.params.productId);

  if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ message: "Invalid product ID." });

  try {
    const product = await db.getProductById(productId);

    if (!product) return res.status(404).json({ message: "Product not found.", });

    res.json(product);
  } catch (error) {
    console.error("Get product error:", error);

    res.status(500).json({
      message: "Unable to fetch product.",
      error: error.message,
    });
  }
});

app.get("/api/stores/:storeId/products", requireDatabase, async (req, res) => {
  const storeId = Number(req.params.storeId);

  if (!Number.isInteger(storeId) || storeId <= 0) {
    return res.status(400).json({
      message: "Invalid store ID."
    });
  }

  try {
    const store = await db.getStoreById(storeId);

    if (!store) {
      return res.status(404).json({
        message: "Store not found.",
      });
    }

    const products = await db.getProductsByStore(storeId);

    res.json({ store, products });
  } catch (error) {
    console.error("Get store products error:", error);

    res.status(500).json({
      message: "Unable to fetch store products.",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT} as at ${new Date().toLocaleTimeString()}`);
});