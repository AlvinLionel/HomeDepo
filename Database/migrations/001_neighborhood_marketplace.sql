USE homedepo;

ALTER TABLE users
  ADD COLUMN account_type ENUM('buyer', 'seller') NOT NULL DEFAULT 'buyer' AFTER email;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_sessions_expiry (expires_at)
);

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  category_slug VARCHAR(100) NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  condition_grade ENUM('like_new', 'good', 'well_loved') NOT NULL,
  neighborhood VARCHAR(100) NOT NULL,
  image_url VARCHAR(500),
  contact_phone VARCHAR(30),
  status ENUM('active', 'sold') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_marketplace_listings_seller
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_marketplace_listings_browse (status, category_slug, created_at),
  INDEX idx_marketplace_listings_seller (seller_id, created_at),
  INDEX idx_marketplace_listings_neighborhood (neighborhood)
);
