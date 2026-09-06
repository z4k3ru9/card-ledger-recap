-- Card Ledger Recap: basic schema
--
-- Three tables, deliberately minimal:
--   auth     - a single row holding the shared app password's bcrypt hash
--   sessions - login sessions (so the login cookie is backed by MySQL
--              instead of PHP's default per-server file storage - works
--              the same across shared hosting restarts/multiple app servers)
--   recaps   - one row per month ("YYYY-MM"), holding that month's whole
--              recap (banks + cash rows) as a JSON blob
--
-- Import this once via cPanel's phpMyAdmin (or `mysql < schema.sql`) after
-- creating the database. Safe to re-run - every statement is IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS auth (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  password_hash VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  data MEDIUMTEXT NOT NULL,
  last_activity INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recaps (
  month CHAR(7) NOT NULL PRIMARY KEY,
  data LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
