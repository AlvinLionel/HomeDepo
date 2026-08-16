const mysql = require("mysql2/promise");

async function initialize() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "Lionel",
    password: process.env.DB_PASSWORD || "",
  });

  await connection.query("CREATE DATABASE IF NOT EXISTS homedepo;");
  await connection.query("USE homedepo;");
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Database initialized successfully");
  await connection.end();
}

initialize().catch((error) => {
  console.error("Database initialization failed:", error.message);
  process.exit(1);
});
