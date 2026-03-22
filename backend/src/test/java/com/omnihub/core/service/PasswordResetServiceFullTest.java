package com.omnihub.core.service;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceFullTest {

    @Mock private UserRepository userRepository;

    @InjectMocks private PasswordResetService passwordResetService;

    private final PasswordEncoder realEncoder = new BCryptPasswordEncoder();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(passwordResetService, "passwordEncoder", realEncoder);
        ReflectionTestUtils.setField(passwordResetService, "fromEmail", "noreply@omnihub.com");
        ReflectionTestUtils.setField(passwordResetService, "baseUrl", "http://localhost:3000");
        // mailSender stays null → no-op email path
    }

    // ── sendResetLink ─────────────────────────────────────────────────────

    @Test
    void sendResetLink_knownEmail_storesHashedTokenNotRaw() {
        User user = new User();
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        passwordResetService.sendResetLink("user@test.com");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();

        // Stored token should be a 64-char SHA-256 hex string, not the raw UUID
        assertNotNull(saved.getPasswordResetToken());
        assertEquals(64, saved.getPasswordResetToken().length());
        // Raw UUIDs are 36 chars (xxxxxxxx-xxxx-...) — stored value must not be a UUID
        assertFalse(saved.getPasswordResetToken().contains("-"));
    }

    @Test
    void sendResetLink_unknownEmail_doesNothingNoException() {
        when(userRepository.findByEmail("nobody@test.com")).thenReturn(Optional.empty());

        // Must NOT throw — prevents email enumeration
        assertDoesNotThrow(() -> passwordResetService.sendResetLink("nobody@test.com"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void sendResetLink_setsExpiryOneHourAhead() {
        User user = new User();
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        LocalDateTime before = LocalDateTime.now();
        passwordResetService.sendResetLink("user@test.com");
        LocalDateTime after = LocalDateTime.now();

        assertTrue(user.getPasswordResetTokenExpiry().isAfter(before.plusMinutes(59)));
        assertTrue(user.getPasswordResetTokenExpiry().isBefore(after.plusHours(1).plusSeconds(1)));
    }

    // ── resetPassword ─────────────────────────────────────────────────────

    @Test
    void resetPassword_validToken_updatesPasswordAndClearsToken() {
        // Simulate: sendResetLink stored the hash of "raw-token"
        String rawToken = "raw-token-abc";
        // Compute SHA-256 manually the same way the service does
        String tokenHash;
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            tokenHash = java.util.HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        User user = new User();
        ReflectionTestUtils.setField(user, "passwordResetToken", tokenHash);
        ReflectionTestUtils.setField(user, "passwordResetTokenExpiry", LocalDateTime.now().plusMinutes(30));

        when(userRepository.findByPasswordResetToken(tokenHash)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        passwordResetService.resetPassword(rawToken, "NewPassword1");

        assertNull(user.getPasswordResetToken(), "Token should be cleared after use");
        assertNull(user.getPasswordResetTokenExpiry());
        assertNotNull(user.getPassword());
        assertTrue(realEncoder.matches("NewPassword1", user.getPassword()));
    }

    @Test
    void resetPassword_expiredToken_throwsException() {
        String rawToken = "expired-token";
        String tokenHash;
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            tokenHash = java.util.HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        User user = new User();
        ReflectionTestUtils.setField(user, "passwordResetToken", tokenHash);
        ReflectionTestUtils.setField(user, "passwordResetTokenExpiry", LocalDateTime.now().minusHours(2));

        when(userRepository.findByPasswordResetToken(tokenHash)).thenReturn(Optional.of(user));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> passwordResetService.resetPassword(rawToken, "NewPassword1"));
        assertTrue(ex.getMessage().contains("expired"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_invalidToken_throwsException() {
        when(userRepository.findByPasswordResetToken(anyString())).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> passwordResetService.resetPassword("unknown-token", "NewPassword1"));
    }
}
