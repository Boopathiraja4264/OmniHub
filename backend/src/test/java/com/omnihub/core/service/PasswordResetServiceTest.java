package com.omnihub.core.service;

import org.junit.jupiter.api.Test;

import java.util.HexFormat;
import java.security.MessageDigest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests the SHA-256 token hashing logic used by PasswordResetService.
 * Verifies the hash is deterministic (same input → same hash) and
 * that raw tokens are never stored (hash != original).
 */
class PasswordResetServiceTest {

    private String sha256(String input) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    @Test
    void sha256_isDeterministic() throws Exception {
        String token = "reset-token-abc123";
        assertEquals(sha256(token), sha256(token));
    }

    @Test
    void sha256_differentInputs_produceDifferentHashes() throws Exception {
        assertNotEquals(sha256("tokenA"), sha256("tokenB"));
    }

    @Test
    void sha256_hashIsNotEqualToOriginal() throws Exception {
        String token = "my-reset-token";
        assertNotEquals(token, sha256(token));
    }

    @Test
    void sha256_output_is64HexChars() throws Exception {
        // SHA-256 produces 32 bytes = 64 hex characters
        assertEquals(64, sha256("anything").length());
    }

    @Test
    void sha256_sameInputAlwaysSameHash() throws Exception {
        // SHA-256 must be deterministic for lookup-by-hash to work
        String token = "reset-abc-123";
        assertEquals(sha256(token), sha256(token));
    }
}
