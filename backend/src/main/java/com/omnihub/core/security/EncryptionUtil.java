package com.omnihub.core.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM encryption for sensitive fields (TOTP secrets, phone numbers).
 * If ENCRYPTION_KEY env var is not set, values pass through unmodified
 * so local dev works without configuration.
 *
 * Generate a key: openssl rand -base64 32
 */
@Component
public class EncryptionUtil {

    private static final Logger log = LoggerFactory.getLogger(EncryptionUtil.class);
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH = 128;

    @Value("${encryption.key:}")
    private String encryptionKeyBase64;

    private SecretKey getKey() {
        if (encryptionKeyBase64 == null || encryptionKeyBase64.isBlank()) return null;
        try {
            byte[] keyBytes = Base64.getDecoder().decode(encryptionKeyBase64);
            return new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            log.warn("Invalid ENCRYPTION_KEY — encryption disabled");
            return null;
        }
    }

    public String encrypt(String plaintext) {
        if (plaintext == null) return null;
        SecretKey key = getKey();
        if (key == null) return plaintext; // no-op if key not configured

        try {
            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes());

            // Prefix with IV so we can decrypt later: [iv (12 bytes)][ciphertext]
            ByteBuffer buf = ByteBuffer.allocate(iv.length + ciphertext.length);
            buf.put(iv);
            buf.put(ciphertext);
            return "ENC:" + Base64.getEncoder().encodeToString(buf.array());
        } catch (Exception e) {
            log.error("Encryption failed", e);
            return plaintext;
        }
    }

    public String decrypt(String ciphertext) {
        if (ciphertext == null) return null;
        if (!ciphertext.startsWith("ENC:")) return ciphertext; // plaintext passthrough (migration safety)

        SecretKey key = getKey();
        if (key == null) return ciphertext;

        try {
            byte[] data = Base64.getDecoder().decode(ciphertext.substring(4));
            ByteBuffer buf = ByteBuffer.wrap(data);
            byte[] iv = new byte[IV_LENGTH];
            buf.get(iv);
            byte[] encrypted = new byte[buf.remaining()];
            buf.get(encrypted);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH, iv));
            return new String(cipher.doFinal(encrypted));
        } catch (Exception e) {
            log.warn("Decryption failed — returning raw value (may be unencrypted legacy data)");
            return ciphertext;
        }
    }
}
