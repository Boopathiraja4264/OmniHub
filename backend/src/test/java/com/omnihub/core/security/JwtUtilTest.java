package com.omnihub.core.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        // 64+ char secret for HS256
        ReflectionTestUtils.setField(jwtUtil, "secret",
            "test-secret-key-that-is-at-least-64-characters-long-for-hs256-algo!");
        ReflectionTestUtils.setField(jwtUtil, "expiration", 86400000L);
        ReflectionTestUtils.setField(jwtUtil, "cacheManager",
            new ConcurrentMapCacheManager("tokenBlacklist"));

        userDetails = User.withUsername("test@example.com")
            .password("irrelevant")
            .authorities(Collections.emptyList())
            .build();
    }

    @Test
    void generateToken_notNull() {
        assertNotNull(jwtUtil.generateToken(userDetails));
    }

    @Test
    void extractUsername_matchesInput() {
        String token = jwtUtil.generateToken(userDetails);
        assertEquals("test@example.com", jwtUtil.extractUsername(token));
    }

    @Test
    void validateToken_validToken_returnsTrue() {
        String token = jwtUtil.generateToken(userDetails);
        assertTrue(jwtUtil.validateToken(token, userDetails));
    }

    @Test
    void validateToken_wrongUser_returnsFalse() {
        String token = jwtUtil.generateToken(userDetails);
        UserDetails other = User.withUsername("other@example.com")
            .password("x").authorities(Collections.emptyList()).build();
        assertFalse(jwtUtil.validateToken(token, other));
    }

    @Test
    void revokedToken_validateReturnsFalse() {
        String token = jwtUtil.generateToken(userDetails);
        jwtUtil.revokeToken(token);
        assertFalse(jwtUtil.validateToken(token, userDetails));
    }

    @Test
    void generateToken_hasJtiClaim() {
        String token = jwtUtil.generateToken(userDetails);
        assertNotNull(jwtUtil.extractJti(token), "Token should contain a jti claim");
    }

    @Test
    void twoTokens_haveDifferentJti() {
        String t1 = jwtUtil.generateToken(userDetails);
        String t2 = jwtUtil.generateToken(userDetails);
        assertNotEquals(jwtUtil.extractJti(t1), jwtUtil.extractJti(t2));
    }
}
