CREATE TABLE startup_connection_event_progress_reports (
  id BIGINT NOT NULL AUTO_INCREMENT,
  event_id INT NOT NULL,
  content TEXT NOT NULL,
  note TEXT NULL,
  created_by INT NULL,
  report_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_startup_event_progress_history (event_id, report_time),
  KEY idx_startup_event_progress_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE networking_event_progress_reports (
  id BIGINT NOT NULL AUTO_INCREMENT,
  event_id INT NOT NULL,
  content TEXT NOT NULL,
  note TEXT NULL,
  created_by INT NULL,
  report_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_networking_event_progress_history (event_id, report_time),
  KEY idx_networking_event_progress_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE incubation_program_progress_reports (
  id BIGINT NOT NULL AUTO_INCREMENT,
  program_id INT NOT NULL,
  content TEXT NOT NULL,
  note TEXT NULL,
  created_by INT NULL,
  report_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_incubation_program_progress_history (program_id, report_time),
  KEY idx_incubation_program_progress_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
