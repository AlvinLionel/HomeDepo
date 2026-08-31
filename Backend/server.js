const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");
const mysql = require("mysql2/promise");

const { sendResetEmail } = require("./mailHandler");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);
let dbReady = false;
let dbMessage = "Database not initialized";

async function checkDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    dbReady = true;
    dbMessage = "Database connection successful";
    console.log("Connected to database successfully");
  } catch (error) {
    dbReady = false;
    dbMessage = error.message;
    console.error("Database connection failed:", error.message);
  }
}
checkDatabaseConnection();

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT = process.env.NOMINATIM_USER_AGENT;
const NOMINATIM_MIN_INTERVAL_MS = 1100;
const SEARCH_CACHE_TTL_MS = 60_000;

const storeSearchCache = new Map();
let nextNominatimRequestAt = 0;

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
  res.json({ status: "ok", dbReady, message: dbMessage });
});

app.get("/api/stores/search", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lng);
  const location = typeof req.query.location === "string" ? req.query.location.trim() : "";

  if (query.length < 2) {
    return res.status(400).json({
      message: "Please enter at least two characters to search for stores.",
    });
  }

  if (!NOMINATIM_USER_AGENT) return res.status(500).json({ message: "Nominatim user agent is not configured on the server." });

  const hasValidLocation =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

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
      name:
        place.namedetails?.name ||
        place.display_name.split(",")[0] ||
        "Unnamed place",
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

app.post("/api/auth/signup", async (req, res) => {
  if (!dbReady) return res.status(503).json({ message: "Database is not ready yet.", detail: dbMessage });

  const { username, email, password } = req.body || {};

  if (!username || !email || !password) return res.status(400).json({ message: "Username, email, and password are required." });

  try {
    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username]
    );

    if (existingUsers.length > 0) return res.status(409).json({ message: "A user with that email or username already exists." });

    const passwordHash = hashPassword(password);
    const [result] = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, passwordHash]
    );

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: result.insertId,
        username,
        email,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Unable to complete signup.", error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  if (!dbReady) return res.status(503).json({ message: "Database is not ready yet.", detail: dbMessage });

  const { email, password } = req.body || {};

  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

  try {
    const passwordHash = hashPassword(password);
    const [rows] = await pool.query(
      "SELECT id, username, email FROM users WHERE email = ? AND password_hash = ? LIMIT 1",
      [email, passwordHash]
    );

    if (rows.length === 0) return res.status(401).json({ message: "Invalid email or password." });

    const user = rows[0];
    const device = (req.get("user-agent") || "Unknown device").slice(0, 255);

    await pool.query(
      `UPDATE users SET last_login_at = UTC_TIMESTAMP(), last_login_device = ? WHERE id = ?`,
      [device, user.id]
    );

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Unable to complete login.", error: error.message });
  }
});

app.post("/api/auth/check-email", async (req, res) => {
  if (!dbReady) return res.status(503).json({ message: "Database is not ready yet.", detail: dbMessage });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const [rows] = await pool.query(
      "SELECT id from users WHERE email = ? LIMIT 1",
      [email]
    );
    if (rows.length === 0) res.status(404).json({ message: "Email not found" });

    res.json({ message: "Email exists", userId: rows[0].id });
  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).json({ message: "Unable to check email.", error: error.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  if (!dbReady) return res.status(503).json({ message: "Database is not ready yet.", detail: dbMessage });

  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ message: "Token and password are required." });

  try {
    const [rows] = await pool.query("SELECT user_id, expires_at FROM reset_tokens WHERE token = ? LIMIT 1", [token]);
    if (rows.length === 0) return res.status(404).json({ message: "Invalid token." });

    if (new Date(rows[0].expires_at) < new Date()) return res.status(400).json({ message: "Token expired." });

    const passwordHash = hashPassword(newPassword);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, rows[0].user_id]);
    await pool.query("DELETE FROM reset_tokens WHERE token = ?", [token]);

    res.json({ message: "Password reset successful." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Unable to reset password.", error: error.message });
  }
});

app.post("/api/auth/request-reset", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const [rows] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (rows.length === 0) return res.status(404).json({ message: "Email not found" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const device = (req.get("user-agent") || "Unknown device").slice(0, 255);

    await pool.query("INSERT INTO reset_tokens(user_id,token,expires_at, device) VALUES (?,?,?,?)", [rows[0].id, token, expiresAt, device]);

    await sendResetEmail(email, token);

    res.json({ message: "Password reset email sent." });
  } catch (err) {
    console.error("Request reset error:", err);
    res.status(500).json({ message: "Unable to send reset email.", error: err.message });
  }
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT} as at ${new Date().toLocaleTimeString()}`);
});
