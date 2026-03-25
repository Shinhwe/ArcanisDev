CREATE TABLE IF NOT EXISTS cms_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash CHAR(128) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cms_users_username (username),
  UNIQUE KEY uq_cms_users_email (email)
);

CREATE TABLE IF NOT EXISTS cms_auth_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME NULL,
  revoked_at DATETIME NULL,
  revoked_reason VARCHAR(255) NULL,
  client_ip VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cms_auth_tokens_token (token),
  KEY ix_cms_auth_tokens_user_id_revoked_at (user_id, revoked_at),
  CONSTRAINT fk_cms_auth_tokens_user_id
    FOREIGN KEY (user_id) REFERENCES cms_users (id)
      ON DELETE CASCADE
);
