USE homedepo;

CREATE TABLE IF NOT EXISTS community_services (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  business_name VARCHAR(150) NOT NULL,
  category ENUM(
    'appliance_repair',
    'cleaning',
    'laundry',
    'personal_care',
    'automotive',
    'other'
  ) NOT NULL,
  description TEXT NOT NULL,
  area VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  website VARCHAR(500) NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  moderator_id INT NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_community_services_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_community_services_moderator
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_community_services_discovery (status, category, latitude, longitude),
  INDEX idx_community_services_user (user_id, created_at),
  INDEX idx_community_services_review_queue (status, created_at)
);
