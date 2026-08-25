CREATE DATABASE IF NOT EXISTS homedepo;

USE homedepo;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
DESCRIBE users;
SELECT * FROM users;

ALTER TABLE users ADD COLUMN last_login_at DATETIME AFTER created_at;
ALTER TABLE users modify COLUMNmodiclast_login_device VARCHAR(255) AFTER last_login_at;
ALTER TABLE users MODIFY COLUMN last_login_at VARCHAR(50);
ALTER TABLE users ADD COLUMN last_login_location varchar(255) AFTER last_login_device;