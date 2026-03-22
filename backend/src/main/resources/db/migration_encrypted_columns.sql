-- Production DB migration: increase column lengths for AES-256-GCM encrypted fields
-- Run this in Neon SQL Editor before deploying the encryption changes.
-- Encrypted values are longer than plaintext: base64(IV + ciphertext) + "ENC:" prefix.

ALTER TABLE transactions
  ALTER COLUMN description TYPE VARCHAR(1000),
  ALTER COLUMN notes TYPE VARCHAR(1000),
  ALTER COLUMN item_name TYPE VARCHAR(500);

ALTER TABLE bank_accounts
  ALTER COLUMN name TYPE VARCHAR(500),
  ALTER COLUMN bank_name TYPE VARCHAR(500);

ALTER TABLE credit_cards
  ALTER COLUMN name TYPE VARCHAR(500),
  ALTER COLUMN bank TYPE VARCHAR(500),
  ALTER COLUMN last_four_digits TYPE VARCHAR(200);

ALTER TABLE email_settings
  ALTER COLUMN custom_email TYPE VARCHAR(500);

ALTER TABLE sms_settings
  ALTER COLUMN phone_number TYPE VARCHAR(500);

ALTER TABLE slack_settings
  ALTER COLUMN webhook_url TYPE VARCHAR(1000);
