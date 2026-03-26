CREATE TABLE IF NOT EXISTS cms_user_verification_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  operation VARCHAR(64) NOT NULL,
  target_value VARCHAR(255) NOT NULL,
  verification_code CHAR(6) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  invalidated_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY ix_cms_user_verification_codes_user_operation (user_id, operation),
  KEY ix_cms_user_verification_codes_lookup (user_id, operation, target_value),
  CONSTRAINT fk_cms_user_verification_codes_user_id
    FOREIGN KEY (user_id) REFERENCES cms_users (id)
      ON DELETE CASCADE
);
