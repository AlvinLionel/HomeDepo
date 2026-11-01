USE homedepo;

SET @homedepo_product_image_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'products'
    AND column_name = 'image_url'
);
SET @homedepo_add_product_image_column = IF(
  @homedepo_product_image_column_exists = 0,
  'ALTER TABLE products ADD COLUMN image_url VARCHAR(500) NULL AFTER unit',
  'SELECT 1'
);
PREPARE homedepo_product_image_migration FROM @homedepo_add_product_image_column;
EXECUTE homedepo_product_image_migration;
DEALLOCATE PREPARE homedepo_product_image_migration;

CREATE TABLE IF NOT EXISTS merchant_applications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  applicant_id INT NOT NULL,
  store_name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  moderator_id INT NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_merchant_applications_applicant
    FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_applications_moderator
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_merchant_applications_queue (status, created_at),
  INDEX idx_merchant_applications_applicant (applicant_id, created_at)
);

CREATE TABLE IF NOT EXISTS merchant_stores (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  store_id INT NOT NULL,
  application_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_merchant_stores_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_stores_store
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_stores_application
    FOREIGN KEY (application_id) REFERENCES merchant_applications(id) ON DELETE CASCADE,
  CONSTRAINT uq_merchant_store_user UNIQUE (user_id, store_id),
  CONSTRAINT uq_merchant_store_application UNIQUE (application_id),
  INDEX idx_merchant_stores_store (store_id)
);

CREATE TABLE IF NOT EXISTS merchant_product_skus (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  sku VARCHAR(100) NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_merchant_product_skus_store
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_product_skus_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT uq_merchant_store_sku UNIQUE (store_id, sku),
  INDEX idx_merchant_product_skus_product (product_id)
);
