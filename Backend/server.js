const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");
const mysql = require("mysql2/promise");

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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", dbReady, message: dbMessage });
});

app.post("/api/auth/signup", async (req, res) => {
  if (!dbReady) {
    return res.status(503).json({ message: "Database is not ready yet.", detail: dbMessage });
  }

  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Username, email, and password are required." });
  }

  try {
    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "A user with that email or username already exists." });
    }

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
  if (!dbReady) {
    return res.status(503).json({ message: "Database is not ready yet.", detail: dbMessage });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const passwordHash = hashPassword(password);
    const [rows] = await pool.query(
      "SELECT id, username, email FROM users WHERE email = ? AND password_hash = ? LIMIT 1",
      [email, passwordHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = rows[0];
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

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
