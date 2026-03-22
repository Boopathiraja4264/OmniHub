package com.omnihub.core.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class EncryptedStringConverterTest {

    private EncryptedStringConverter converter;
    // Valid AES-256 key: 32 bytes of 0x2A ('*'), base64-encoded
    private static final String TEST_KEY = "KioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKio=";

    @BeforeEach
    void setUp() {
        EncryptionUtil util = new EncryptionUtil();
        ReflectionTestUtils.setField(util, "encryptionKeyBase64", TEST_KEY);

        converter = new EncryptedStringConverter();
        converter.setEncryptionUtil(util);
    }

    @Test
    void convertToDatabaseColumn_encryptsValue() {
        String db = converter.convertToDatabaseColumn("sensitive");
        assertTrue(db.startsWith("ENC:"));
    }

    @Test
    void convertToEntityAttribute_decryptsValue() {
        String db = converter.convertToDatabaseColumn("sensitive");
        String entity = converter.convertToEntityAttribute(db);
        assertEquals("sensitive", entity);
    }

    @Test
    void convertToEntityAttribute_legacyPlaintext_passthrough() {
        // Existing plaintext rows (no ENC: prefix) should come back unchanged
        assertEquals("old-plain-value", converter.convertToEntityAttribute("old-plain-value"));
    }

    @Test
    void convertToDatabaseColumn_null_returnsNull() {
        assertNull(converter.convertToDatabaseColumn(null));
    }

    @Test
    void convertToEntityAttribute_null_returnsNull() {
        assertNull(converter.convertToEntityAttribute(null));
    }

    @Test
    void roundTrip_bankAccountName() {
        String name = "HDFC Salary Account";
        String db = converter.convertToDatabaseColumn(name);
        assertEquals(name, converter.convertToEntityAttribute(db));
    }

    @Test
    void roundTrip_transactionDescription() {
        String desc = "Swiggy order - Biryani and Naan from Paradise Restaurant";
        assertEquals(desc, converter.convertToEntityAttribute(converter.convertToDatabaseColumn(desc)));
    }

    @Test
    void roundTrip_creditCardLastFour() {
        assertEquals("4242", converter.convertToEntityAttribute(converter.convertToDatabaseColumn("4242")));
    }
}
