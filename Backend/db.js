const crypto = require("crypto");
const mysql = require("mysql2/promise");
const path = require("path");
const { promisify } = require("util");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const scrypt = promisify(crypto.scrypt);
const PASSWORD_KEY_LENGTH = 64;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

let dbReady = false;
let dbMessage = "Database not initialized";

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  if (storedHash.startsWith("scrypt$")) {
    const [, salt, storedKey] = storedHash.split("$");
    if (!salt || !storedKey) return false;

    const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
    const expectedKey = Buffer.from(storedKey, "hex");
    return expectedKey.length === derivedKey.length &&
      crypto.timingSafeEqual(expectedKey, derivedKey);
  }

  const legacyHash = crypto.createHash("sha256").update(password).digest("hex");
  const expectedHash = Buffer.from(storedHash, "hex");
  const actualHash = Buffer.from(legacyHash, "hex");
  return expectedHash.length === actualHash.length &&
    crypto.timingSafeEqual(expectedHash, actualHash);
}

async function checkDatabaseConnection() {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.ping();
    dbReady = true;
    dbMessage = "Database connection successful";
    console.log("Connected to database successfully");
  } catch (error) {
    dbReady = false;
    dbMessage = error.message;
    console.error("Database connection failed:", error.message);
  } finally {
    if (connection) connection.release();
  }
}

function getStatus() {
  return { dbReady, dbMessage };
}

async function findUserByEmailOrUsername(email, username) {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1",
    [email, username]
  );
  return rows.length > 0;
}

async function createUser(username, email, password, accountType = "buyer") {
  const [result] = await pool.query(
    "INSERT INTO users (username, email, password_hash, account_type) VALUES (?, ?, ?, ?)",
    [username, email, await hashPassword(password), accountType]
  );
  return { id: result.insertId, username, email, accountType };
}

async function findUserByCredentials(email, password) {
  const [rows] = await pool.query(
    "SELECT id, username, email, password_hash, account_type FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) return null;

  if (!user.password_hash.startsWith("scrypt$")) {
    await pool.query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [await hashPassword(password), user.id]
    );
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    accountType: user.account_type,
  };
}

async function updateLastLogin(userId, device) {
  await pool.query(
    "UPDATE users SET last_login_at = UTC_TIMESTAMP(), last_login_device = ? WHERE id = ?",
    [device, userId]
  );
}

async function getUserIdByEmail(email) {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows.length > 0 ? rows[0].id : null;
}

async function resetPassword(token, newPassword) {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [rows] = await connection.query(
      "SELECT user_id, expires_at FROM reset_tokens WHERE token = ? LIMIT 1 FOR UPDATE",
      [token]
    );

    if (rows.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return "invalid";
    }

    if (new Date(rows[0].expires_at) < new Date()) {
      await connection.rollback();
      transactionStarted = false;
      return "expired";
    }

    await connection.query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [await hashPassword(newPassword), rows[0].user_id]
    );
    await connection.query("DELETE FROM reset_tokens WHERE token = ?", [token]);
    await connection.query("DELETE FROM user_sessions WHERE user_id = ?", [rows[0].user_id]);
    await connection.commit();
    transactionStarted = false;
    return "reset";
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createResetToken(userId, token, expiresAt, device) {
  await pool.query(
    "INSERT INTO reset_tokens(user_id, token, expires_at, device) VALUES (?, ?, ?, ?)",
    [userId, token, expiresAt, device]
  );
}

async function createUserSession(userId, tokenHash) {
  await pool.query("DELETE FROM user_sessions WHERE expires_at <= UTC_TIMESTAMP()");
  await pool.query(
    "INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))",
    [userId, tokenHash]
  );
}

async function findUserBySession(tokenHash) {
  const [rows] = await pool.query(
    `SELECT users.id, users.username, users.email, users.account_type
     FROM user_sessions
     JOIN users ON users.id = user_sessions.user_id
     WHERE user_sessions.token_hash = ? AND user_sessions.expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash]
  );

  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    username: rows[0].username,
    email: rows[0].email,
    accountType: rows[0].account_type,
  };
}

async function revokeUserSession(tokenHash) {
  await pool.query("DELETE FROM user_sessions WHERE token_hash = ?", [tokenHash]);
}

async function upgradeUserToSeller(userId) {
  const [result] = await pool.query(
    "UPDATE users SET account_type = 'seller' WHERE id = ? AND account_type = 'buyer'",
    [userId]
  );
  return result.affectedRows > 0;
}

async function getMarketplaceListings({ query, category, location, limit }) {
  const conditions = ["listings.status = 'active'"];
  const values = [];

  if (query) {
    conditions.push("(listings.title LIKE ? OR listings.description LIKE ?)");
    values.push(`%${query}%`, `%${query}%`);
  }
  if (category) {
    conditions.push("listings.category_slug = ?");
    values.push(category);
  }
  if (location) {
    conditions.push("listings.neighborhood LIKE ?");
    values.push(`%${location}%`);
  }

  const [rows] = await pool.query(
    `SELECT listings.id, listings.seller_id, listings.title, listings.description,
            listings.category_slug, listings.price, listings.condition_grade,
            listings.neighborhood, listings.image_url, listings.contact_phone,
            listings.created_at, users.username AS seller_name
     FROM marketplace_listings AS listings
     JOIN users ON users.id = listings.seller_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY listings.created_at DESC
     LIMIT ?`,
    [...values, limit]
  );

  return rows.map((listing) => ({
    id: listing.id,
    sellerId: listing.seller_id,
    title: listing.title,
    description: listing.description,
    category: listing.category_slug,
    price: Number(listing.price),
    condition: listing.condition_grade,
    neighborhood: listing.neighborhood,
    imageUrl: listing.image_url,
    contactPhone: listing.contact_phone,
    createdAt: listing.created_at,
    sellerName: listing.seller_name,
  }));
}

async function getSellerListings(sellerId) {
  const [rows] = await pool.query(
    `SELECT id, title, description, category_slug, price, condition_grade,
            neighborhood, image_url, contact_phone, status, created_at
     FROM marketplace_listings
     WHERE seller_id = ?
     ORDER BY created_at DESC`,
    [sellerId]
  );

  return rows.map((listing) => ({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    category: listing.category_slug,
    price: Number(listing.price),
    condition: listing.condition_grade,
    neighborhood: listing.neighborhood,
    imageUrl: listing.image_url,
    contactPhone: listing.contact_phone,
    status: listing.status,
    createdAt: listing.created_at,
  }));
}

async function createMarketplaceListing(sellerId, listing) {
  const [result] = await pool.query(
    `INSERT INTO marketplace_listings
       (seller_id, title, description, category_slug, price, condition_grade,
        neighborhood, image_url, contact_phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sellerId,
      listing.title,
      listing.description,
      listing.category,
      listing.price,
      listing.condition,
      listing.neighborhood,
      listing.imageUrl,
      listing.contactPhone,
    ]
  );

  return result.insertId;
}

async function updateMarketplaceListingStatus(listingId, sellerId, status) {
  const [result] = await pool.query(
    `UPDATE marketplace_listings
     SET status = ?
     WHERE id = ? AND seller_id = ? AND status IN ('active', 'sold')`,
    [status, listingId, sellerId]
  );

  return result.affectedRows > 0;
}

async function getProductsByDepartment(departmentSlug) {
  const [rows] = await pool.query(
    `
      SELECT
        p.id, p.name, p.description, p.brand, p.unit, (
                SELECT sp2.image_url
                FROM store_products sp2
                WHERE sp2.product_id = p.id AND sp2.is_available = TRUE AND sp2.stock_quantity > 0
                ORDER BY sp2.price ASC, sp2.id ASC
                LIMIT 1
            ) AS image_url,
             MIN(sp.price) AS starting_price, COUNT(DISTINCT sp.store_id) AS store_count
      FROM products p
      JOIN store_products sp ON p.id = sp.product_id
      WHERE p.department_slug = ? AND sp.is_available = TRUE AND sp.stock_quantity > 0
      GROUP BY
        p.id, p.name, p.description, p.brand, p.unit
      ORDER BY p.name
    `,
    [departmentSlug]
  );

  return rows.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    brand: product.brand,
    unit: product.unit,
    imageUrl: product.image_url,
    startingPrice: Number(product.starting_price),
    storeCount: Number(product.store_count),
  }));
}

async function recordProductTrend({ productId, eventType, area, visitorHash }) {
  await pool.query(
    `INSERT IGNORE INTO product_trend_events
       (product_id, event_type, area, visitor_hash, event_date)
     SELECT id, ?, ?, ?, UTC_DATE()
     FROM products
     WHERE id = ?`,
    [eventType, area, visitorHash, productId]
  );
}

async function getTrendingProducts({ area, limit = 12 }) {
  const [rows] = await pool.query(
    `SELECT products.id, products.name, products.description, products.brand,
            MIN(store_products.image_url) AS image_url,
            MIN(store_products.price) AS starting_price,
            COUNT(DISTINCT store_products.store_id) AS store_count,
            COUNT(DISTINCT trends.visitor_hash) AS shopper_count,
            COUNT(DISTINCT CASE WHEN trends.event_type = 'search'
              THEN trends.visitor_hash END) AS searcher_count,
            COUNT(DISTINCT CASE WHEN trends.event_type = 'view'
              THEN trends.visitor_hash END) AS viewer_count
     FROM product_trend_events AS trends
     JOIN products ON products.id = trends.product_id
     JOIN store_products ON store_products.product_id = products.id
     JOIN stores ON stores.id = store_products.store_id
     WHERE trends.event_date >= DATE_SUB(UTC_DATE(), INTERVAL 6 DAY)
       AND (? = '' OR LOWER(trends.area) = LOWER(?))
       AND (? = '' OR LOWER(stores.address) LIKE CONCAT('%', LOWER(?), '%'))
       AND store_products.is_available = TRUE
       AND store_products.stock_quantity > 0
       AND stores.is_active = TRUE
     GROUP BY products.id, products.name, products.description, products.brand
     HAVING COUNT(DISTINCT trends.visitor_hash) >= 2
     ORDER BY shopper_count DESC, searcher_count DESC, viewer_count DESC,
              products.name ASC
     LIMIT ?`,
    [area, area, area, area, limit]
  );

  return rows.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    brand: product.brand,
    imageUrl: product.image_url,
    startingPrice: Number(product.starting_price),
    storeCount: Number(product.store_count),
    shopperCount: Number(product.shopper_count),
    searcherCount: Number(product.searcher_count),
    viewerCount: Number(product.viewer_count),
  }));
}

async function getProductById(productId) {
  const [rows] = await pool.query(
    `
      SELECT
        p.id AS product_id, p.name, p.description, p.brand, p.unit, s.id AS store_id,sp.image_url, s.name AS store_name, s.address, s.phone, s.email, sp.price, sp.stock_quantity, sp.is_available
      FROM products p
      LEFT JOIN store_products sp ON p.id = sp.product_id
      LEFT JOIN stores s ON sp.store_id = s.id
      WHERE p.id = ?
      ORDER BY sp.price ASC
    `,
    [productId]
  );

  if (rows.length === 0) return null;

  return {
    id: rows[0].product_id,
    name: rows[0].name,
    description: rows[0].description,
    brand: rows[0].brand,
    unit: rows[0].unit,
    imageUrl: rows[0].image_url,

    stores: rows
      .filter((row) => row.store_id !== null)
      .map((row) => ({
        id: row.store_id,
        name: row.store_name,
        address: row.address,
        phone: row.phone,
        email: row.email,
        imageUrl: row.image_url,
        price: Number(row.price),
        stockQuantity: row.stock_quantity,
        isAvailable: Boolean(row.is_available),
      })),
  };
}

async function getProductsByStore(storeId) {
  const [rows] = await pool.query(
    `
      SELECT
        p.id,  p.name, p.description, p.brand, p.unit, sp.image_url, p.department_slug, sp.price, sp.stock_quantity, sp.is_available
      FROM store_products sp
      JOIN products p ON sp.product_id = p.id
      WHERE sp.store_id = ? AND sp.is_available = TRUE
      ORDER BY p.name
    `,
    [storeId]
  );

  return rows.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    brand: product.brand,
    unit: product.unit,
    imageUrl: product.image_url,
    departmentSlug: product.department_slug,
    price: Number(product.price),
    stockQuantity: product.stock_quantity,
    isAvailable: Boolean(product.is_available),
  }));
}

async function getStoreById(storeId) {
  const [rows] = await pool.query(
    `
      SELECT
        id, name, description, address, phone, email, latitude, longitude, is_active
      FROM stores
      WHERE id = ?
      LIMIT 1
    `,
    [storeId]
  );

  return rows[0] || null;
}

module.exports = {
  checkDatabaseConnection,
  getStatus,
  findUserByEmailOrUsername,
  createUser,
  findUserByCredentials,
  updateLastLogin,
  createUserSession,
  findUserBySession,
  revokeUserSession,
  upgradeUserToSeller,
  getUserIdByEmail,
  resetPassword,
  createResetToken,
  getProductsByDepartment,
  recordProductTrend,
  getTrendingProducts,
  getProductById,
  getProductsByStore,
  getStoreById,
  getMarketplaceListings,
  getSellerListings,
  createMarketplaceListing,
  updateMarketplaceListingStatus,
};
