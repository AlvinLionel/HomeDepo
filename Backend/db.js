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
};
