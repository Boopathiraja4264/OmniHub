package com.omnihub.core.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class EncryptionUtilTest {

    private EncryptionUtil encryptionUtil;
    // Valid AES-256 key: 32 bytes of 0x2A ('*'), base64-encoded → 44 chars
    private static final String TEST_KEY = "KioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKio=";

    @BeforeEach
    void setUp() {
        encryptionUtil = new EncryptionUtil();
        ReflectionTestUtils.setField(encryptionUtil, "encryptionKeyBase64", TEST_KEY);
    }

    @Test
    void encrypt_producesEncPrefix() {
        String result = encryptionUtil.encrypt("hello");
        assertTrue(result.startsWith("ENC:"), "Encrypted value should start with ENC:");
    }

    @Test
    void encryptThenDecrypt_roundTrip() {
        String original = "my-secret-totp-base32secret";
        String encrypted = encryptionUtil.encrypt(original);
        String decrypted = encryptionUtil.decrypt(encrypted);
        assertEquals(original, decrypted);
    }

    @Test
    void decrypt_plaintext_passthrough() {
        // Values without ENC: prefix (legacy unencrypted data) must be returned as-is
        String plain = "some-old-plaintext-value";
        assertEquals(plain, encryptionUtil.decrypt(plain));
    }

    @Test
    void encrypt_null_returnsNull() {
        assertNull(encryptionUtil.encrypt(null));
    }

    @Test
    void decrypt_null_returnsNull() {
        assertNull(encryptionUtil.decrypt(null));
    }

    @Test
    void encrypt_producesUniqueIvEachCall() {
        // Two encryptions of the same plaintext should produce different ciphertexts (random IV)
        String a = encryptionUtil.encrypt("same-input");
        String b = encryptionUtil.encrypt("same-input");
        assertNotEquals(a, b, "Each encryption should use a fresh random IV");
    }

    @Test
    void encryptThenDecrypt_phoneNumber() {
        String phone = "+919876543210";
        assertEquals(phone, encryptionUtil.decrypt(encryptionUtil.encrypt(phone)));
    }

    @Test
    void encryptThenDecrypt_longDescription() {
        String desc = "Grocery shopping at Big Bazaar — vegetables, fruits, and household items for the week";
        assertEquals(desc, encryptionUtil.decrypt(encryptionUtil.encrypt(desc)));
    }

    @Test
    void encryptThenDecrypt_slackWebhookUrl() {
        String url = "https://hooks.example.com/services/test-webhook-url-placeholder";
        assertEquals(url, encryptionUtil.decrypt(encryptionUtil.encrypt(url)));
    }

    @Test
    void noKeyConfigured_encryptReturnsPlaintext() {
        EncryptionUtil noKeyUtil = new EncryptionUtil();
        ReflectionTestUtils.setField(noKeyUtil, "encryptionKeyBase64", "");
        String plain = "sensitive-data";
        assertEquals(plain, noKeyUtil.encrypt(plain));
    }

    @Test
    void noKeyConfigured_decryptReturnsPlaintext() {
        EncryptionUtil noKeyUtil = new EncryptionUtil();
        ReflectionTestUtils.setField(noKeyUtil, "encryptionKeyBase64", "");
        // A value that looks encrypted but key is missing — decrypt returns raw value
        String fake = "ENC:somebase64==";
        assertEquals(fake, noKeyUtil.decrypt(fake));
    }
}
