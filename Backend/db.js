const crypto = require("crypto");
const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

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

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
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

async function createUser(username, email, password) {
  const [result] = await pool.query(
    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    [username, email, hashPassword(password)]
  );
  return { id: result.insertId, username, email };
}

async function findUserByCredentials(email, password) {
  const [rows] = await pool.query(
    "SELECT id, username, email FROM users WHERE email = ? AND password_hash = ? LIMIT 1",
    [email, hashPassword(password)]
  );
  return rows[0] || null;
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
      [hashPassword(newPassword), rows[0].user_id]
    );
    await connection.query("DELETE FROM reset_tokens WHERE token = ?", [token]);
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
  getUserIdByEmail,
  resetPassword,
  createResetToken,
  getProductsByDepartment,
  getProductById,
  getProductsByStore,
  getStoreById,
};
