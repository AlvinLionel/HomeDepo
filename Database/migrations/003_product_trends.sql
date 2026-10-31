USE homedepo;

CREATE TABLE IF NOT EXISTS product_trend_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  event_type ENUM('search', 'view') NOT NULL,
  area VARCHAR(100) NOT NULL DEFAULT '',
  visitor_hash CHAR(64) NOT NULL,
  event_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_trend_events_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT uq_product_trend_daily_visitor
    UNIQUE (visitor_hash, product_id, event_type, area, event_date),
  INDEX idx_product_trend_area_date (area, event_date, product_id),
  INDEX idx_product_trend_date_product (event_date, product_id)
);
