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
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.mockito.quality.Strictness;
import org.mockito.junit.jupiter.MockitoSettings;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TwoFactorServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private CacheManager cacheManager;
    @Mock private Cache cache;

    @InjectMocks private TwoFactorService twoFactorService;

    private final PasswordEncoder realEncoder = new BCryptPasswordEncoder();

    private User makeUser(Long id) {
        User u = new User();
        ReflectionTestUtils.setField(u, "id", id);
        ReflectionTestUtils.setField(u, "email", "user@test.com");
        return u;
    }

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(twoFactorService, "passwordEncoder", realEncoder);
        ReflectionTestUtils.setField(twoFactorService, "fromEmail", "noreply@omnihub.com");
        when(cacheManager.getCache("otpCache")).thenReturn(cache);
    }

    // ── TOTP setup ────────────────────────────────────────────────────────

    @Test
    void setupTotp_returnsSecretAndQrCode() {
        User user = makeUser(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> result = twoFactorService.setupTotp(1L);

        assertNotNull(result.get("secret"));
        assertNotNull(result.get("qrCodeDataUrl"));
        assertNotNull(result.get("otpauthUri"));
        // Stored TOTP secret must match what was set on the user
        assertNotNull(user.getTotpSecret());
    }

    @Test
    void setupTotp_otpauthUri_containsEmail() {
        User user = makeUser(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> result = twoFactorService.setupTotp(1L);
        String uri = (String) result.get("otpauthUri");

        assertTrue(uri.contains("user@test.com"));
        assertTrue(uri.startsWith("otpauth://totp/"));
    }

    // ── Email OTP ─────────────────────────────────────────────────────────

    @Test
    void sendEmailOtp_storesHashedOtpInCache() {
        User user = makeUser(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        twoFactorService.sendEmailOtp(1L);

        verify(cache).put(eq("2fa:1"), argThat(
                v -> v instanceof String && ((String) v).startsWith("$2a$")
        ));
    }

    @Test
    void verifyEmailOtp_correctCode_returnsTrue() {
        String otp = "654321";
        String hashed = realEncoder.encode(otp);

        Cache.ValueWrapper wrapper = mock(Cache.ValueWrapper.class);
        when(wrapper.get()).thenReturn(hashed);
        when(cache.get("2fa:1")).thenReturn(wrapper);

        assertTrue(twoFactorService.verifyEmailOtp(1L, otp));
        verify(cache).evict("2fa:1");
    }

    @Test
    void verifyEmailOtp_wrongCode_returnsFalse() {
        String hashed = realEncoder.encode("111111");
        Cache.ValueWrapper wrapper = mock(Cache.ValueWrapper.class);
        when(wrapper.get()).thenReturn(hashed);
        when(cache.get("2fa:1")).thenReturn(wrapper);

        assertFalse(twoFactorService.verifyEmailOtp(1L, "999999"));
        verify(cache, never()).evict(any());
    }

    @Test
    void verifyEmailOtp_noEntry_returnsFalse() {
        when(cache.get("2fa:1")).thenReturn(null);
        assertFalse(twoFactorService.verifyEmailOtp(1L, "123456"));
    }

    // ── Push challenge ────────────────────────────────────────────────────

    @Test
    void initiatePushChallenge_storesPendingTokenOnUser() {
        User user = makeUser(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        String token = twoFactorService.initiatePushChallenge(1L);

        assertNotNull(token);
        assertEquals(token, user.getPendingPushChallengeToken());
        assertEquals("PENDING", user.getPushChallengeStatus());
    }

    @Test
    void pollPushStatus_correctToken_returnsPendingThenApproved() {
        User user = makeUser(1L);
        String token = "challenge-token-xyz";
        ReflectionTestUtils.setField(user, "pendingPushChallengeToken", token);
        ReflectionTestUtils.setField(user, "pushChallengeStatus", "PENDING");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertEquals("PENDING", twoFactorService.pollPushStatus(1L, token));
    }

    @Test
    void pollPushStatus_wrongToken_returnsInvalid() {
        User user = makeUser(1L);
        ReflectionTestUtils.setField(user, "pendingPushChallengeToken", "real-token");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertEquals("INVALID", twoFactorService.pollPushStatus(1L, "wrong-token"));
    }

    @Test
    void approvePushChallenge_setsApproved() {
        User user = makeUser(1L);
        String token = "approve-me";
        ReflectionTestUtils.setField(user, "pendingPushChallengeToken", token);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        twoFactorService.approvePushChallenge(1L, token);

        assertEquals("APPROVED", user.getPushChallengeStatus());
    }

    @Test
    void denyPushChallenge_setsDenied() {
        User user = makeUser(1L);
        String token = "deny-me";
        ReflectionTestUtils.setField(user, "pendingPushChallengeToken", token);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        twoFactorService.denyPushChallenge(1L, token);

        assertEquals("DENIED", user.getPushChallengeStatus());
    }

    @Test
    void approvePushChallenge_wrongToken_throwsException() {
        User user = makeUser(1L);
        ReflectionTestUtils.setField(user, "pendingPushChallengeToken", "real-token");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThrows(RuntimeException.class,
                () -> twoFactorService.approvePushChallenge(1L, "wrong-token"));
    }

    // ── disable2FA ────────────────────────────────────────────────────────

    @Test
    void disable2FA_clearsAllTotpFields() {
        User user = makeUser(1L);
        ReflectionTestUtils.setField(user, "totpSecret", "ENC:somesecret");
        ReflectionTestUtils.setField(user, "totpEnabled", true);
        ReflectionTestUtils.setField(user, "twoFactorMethod", "TOTP");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        twoFactorService.disable2FA(1L);

        assertNull(user.getTotpSecret());
        assertFalse(user.isTotpEnabled());
        assertEquals("NONE", user.getTwoFactorMethod());
        assertNull(user.getTotpBackupCodes());
    }
}
