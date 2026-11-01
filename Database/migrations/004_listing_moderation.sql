USE homedepo;

ALTER TABLE marketplace_listings
  MODIFY COLUMN status ENUM('active', 'sold', 'removed') NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS marketplace_listing_reports (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  listing_id BIGINT NOT NULL,
  reporter_id INT NOT NULL,
  reason ENUM(
    'scam',
    'counterfeit',
    'misleading',
    'prohibited',
    'suspicious_contact',
    'other'
  ) NOT NULL,
  details VARCHAR(1000) NOT NULL DEFAULT '',
  status ENUM('pending', 'dismissed', 'listing_removed') NOT NULL DEFAULT 'pending',
  moderator_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  CONSTRAINT fk_marketplace_listing_reports_listing
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_marketplace_listing_reports_reporter
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_marketplace_listing_reports_moderator
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_marketplace_listing_reporter
    UNIQUE (listing_id, reporter_id),
  INDEX idx_marketplace_listing_reports_queue (status, created_at),
  INDEX idx_marketplace_listing_reports_listing (listing_id, status)
);
