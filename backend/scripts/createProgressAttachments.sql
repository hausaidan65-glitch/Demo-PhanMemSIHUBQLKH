CREATE TABLE progress_attachments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  progress_type ENUM(
    'TRAINING',
    'STARTUP_CONNECTION',
    'NETWORKING',
    'INCUBATION'
  ) NOT NULL,
  progress_report_id BIGINT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(150) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  uploaded_by INT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_progress_attachments_report (progress_type, progress_report_id),
  KEY idx_progress_attachments_uploaded_by (uploaded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
