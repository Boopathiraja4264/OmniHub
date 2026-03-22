package com.omnihub.core.service;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailVerificationServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private CacheManager cacheManager;
    @Mock private Cache cache;

    @InjectMocks private EmailVerificationService emailVerificationService;

    private final PasswordEncoder realEncoder = new BCryptPasswordEncoder();

    @BeforeEach
    void setUp() {
        // Use real BCrypt encoder so OTP hashing works end-to-end
        ReflectionTestUtils.setField(emailVerificationService, "passwordEncoder", realEncoder);
        ReflectionTestUtils.setField(emailVerificationService, "fromEmail", "noreply@omnihub.com");
        when(cacheManager.getCache("otpCache")).thenReturn(cache);
    }

    // ── sendVerificationOtp ────────────────────────────────────────────────

    @Test
    void sendVerificationOtp_storesHashedOtpInCache() {
        emailVerificationService.sendVerificationOtp("user@test.com");

        // Should store a hashed OTP (not the raw code) under the "verify:" key
        verify(cache).put(eq("verify:user@test.com"), argThat(
                value -> value instanceof String && ((String) value).startsWith("$2a$")
        ));
    }

    @Test
    void sendVerificationOtp_emailNormalized_toLowercase() {
        emailVerificationService.sendVerificationOtp("User@TEST.com");
        verify(cache).put(eq("verify:user@test.com"), any());
    }

    @Test
    void sendVerificationOtp_noMailSender_doesNotThrow() {
        // mailSender is null (not injected) — should log and return silently
        assertDoesNotThrow(() -> emailVerificationService.sendVerificationOtp("user@test.com"));
    }

    // ── verifyOtp ─────────────────────────────────────────────────────────

    @Test
    void verifyOtp_correctCode_marksUserVerified() {
        String otp = "123456";
        String hashed = realEncoder.encode(otp);

        Cache.ValueWrapper wrapper = mock(Cache.ValueWrapper.class);
        when(wrapper.get()).thenReturn(hashed);
        when(cache.get("verify:user@test.com")).thenReturn(wrapper);

        User user = new User();
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

        emailVerificationService.verifyOtp("user@test.com", otp);

        assertTrue(user.isEmailVerified());
        verify(userRepository).save(user);
        verify(cache).evict("verify:user@test.com");
    }

    @Test
    void verifyOtp_wrongCode_throwsException() {
        String hashed = realEncoder.encode("999999");
        Cache.ValueWrapper wrapper = mock(Cache.ValueWrapper.class);
        when(wrapper.get()).thenReturn(hashed);
        when(cache.get("verify:user@test.com")).thenReturn(wrapper);

        assertThrows(RuntimeException.class,
                () -> emailVerificationService.verifyOtp("user@test.com", "000000"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void verifyOtp_noEntryInCache_throwsExpiredError() {
        when(cache.get("verify:user@test.com")).thenReturn(null);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> emailVerificationService.verifyOtp("user@test.com", "123456"));
        assertTrue(ex.getMessage().contains("expired") || ex.getMessage().contains("not found"));
    }

    @Test
    void verifyOtp_nullCache_throwsUnavailableError() {
        when(cacheManager.getCache("otpCache")).thenReturn(null);

        assertThrows(RuntimeException.class,
                () -> emailVerificationService.verifyOtp("user@test.com", "123456"));
    }
}
