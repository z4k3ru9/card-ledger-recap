-- Card Ledger Recap: basic schema
--
-- Four tables, deliberately minimal:
--   auth                 - a single row holding the shared app password's
--                           bcrypt hash (nullable - see passkeys below) and
--                           the WebAuthn "user handle" shared by every
--                           passkey registered for this app
--   sessions             - login sessions (so the login cookie is backed by
--                           MySQL instead of PHP's default per-server file
--                           storage - works the same across shared hosting
--                           restarts/multiple app servers)
--   recaps                - one row per month ("YYYY-MM"), holding that
--                           month's whole recap (banks + cash rows) as a
--                           JSON blob
--   webauthn_credentials  - one row per registered passkey (any number of
--                           people/devices can each register their own -
--                           they all unlock the same shared account)
--
-- Import this once via cPanel's phpMyAdmin (or `mysql < schema.sql`) after
-- creating the database. Safe to re-run - every statement is IF NOT EXISTS,
-- except the two ALTER TABLE statements at the bottom, which upgrade a
-- database created before passkeys existed (also safe to re-run - MODIFY is
-- idempotent, and ADD COLUMN IF NOT EXISTS is a no-op once the column is
-- there; needs MySQL 8.0.29+ or MariaDB 10.0.2+, same as this app's PHP
-- 8.0+ requirement in spirit).

CREATE TABLE IF NOT EXISTS auth (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  password_hash VARCHAR(255) NULL,
  webauthn_user_id VARBINARY(32) NULL,
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
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  public_key TEXT NOT NULL,
  sign_count INT UNSIGNED NOT NULL DEFAULT 0,
  label VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  scope VARCHAR(40) NOT NULL,
  key_hash CHAR(64) NOT NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  window_started TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_attempt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (scope, key_hash),
  INDEX auth_rate_limits_last_attempt (last_attempt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Upgrades a database created before passkeys existed. password_hash was
-- originally NOT NULL; it has to become nullable so the password can be
-- revoked once at least one passkey is registered.
ALTER TABLE auth MODIFY COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE auth ADD COLUMN IF NOT EXISTS webauthn_user_id VARBINARY(32) NULL;
ALTER TABLE recaps ADD COLUMN IF NOT EXISTS revision INT UNSIGNED NOT NULL DEFAULT 1;
