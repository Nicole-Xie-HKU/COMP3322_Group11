-- Additive backend tables. The merged main schema.sql and its four tables are unchanged.
CREATE TABLE IF NOT EXISTS terms (
  term_id VARCHAR(50) PRIMARY KEY, term_name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL, end_date DATE NOT NULL, sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS backend_course_metadata (
  course_code VARCHAR(20) PRIMARY KEY, credits DECIMAL(5,1) NULL,
  FOREIGN KEY (course_code) REFERENCES courses(course_code), CHECK (credits IS NULL OR credits>=0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS backend_section_metadata (
  section_id INT PRIMARY KEY, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  section_type VARCHAR(10) NOT NULL DEFAULT 'CLASS', parent_section VARCHAR(20) NULL,
  campus VARCHAR(100) NULL, seats_left INT NULL, waitlist_open BOOLEAN NULL, waitlist_count INT NULL,
  FOREIGN KEY (section_id) REFERENCES sections(section_id),
  CHECK (section_type IN ('CLASS','LEC','TUT','LAB','SEM','OTH')),
  CHECK (seats_left IS NULL OR seats_left>=0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS guest_sessions (
  session_id CHAR(36) PRIMARY KEY, token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_expiry (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS saved_schedules (
  schedule_id INT AUTO_INCREMENT PRIMARY KEY, owner_session_id CHAR(36) NOT NULL,
  term_id VARCHAR(50) NOT NULL, name VARCHAR(100) NOT NULL,
  section_keys JSON NOT NULL, blocked JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_session_id) REFERENCES guest_sessions(session_id),
  KEY idx_owner (owner_session_id,schedule_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS catalog_imports (
  import_id INT AUTO_INCREMENT PRIMARY KEY, source_sha256 CHAR(64) NOT NULL,
  counts JSON NOT NULL, imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
