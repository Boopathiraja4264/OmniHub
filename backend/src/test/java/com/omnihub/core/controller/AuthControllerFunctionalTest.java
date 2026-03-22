package com.omnihub.core.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.exception.GlobalExceptionHandler;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.core.security.JwtUtil;
import com.omnihub.core.service.AuthService;
import com.omnihub.core.service.EmailVerificationService;
import com.omnihub.core.service.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Functional tests for AuthController — tests the full HTTP request/response cycle:
 * status codes, response body, cookies, validation errors.
 * Uses MockMvc standaloneSetup (no Spring context / no DB required).
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerFunctionalTest {

    private MockMvc mockMvc;
    private final ObjectMapper mapper = new ObjectMapper();

    @Mock private AuthService authService;
    @Mock private EmailVerificationService emailVerificationService;
    @Mock private PasswordResetService passwordResetService;
    @Mock private JwtUtil jwtUtil;
    @Mock private UserRepository userRepository;
    @Mock private CacheManager cacheManager;

    @InjectMocks private AuthController authController;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authController, "cookieSecure", false);
        ReflectionTestUtils.setField(authController, "cookieSameSite", "Lax");
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // ── POST /api/auth/register ────────────────────────────────────────────

    @Test
    void register_validRequest_returns200AndRequiresVerification() throws Exception {
        when(authService.register(any())).thenReturn(
                new AuthResponse(null, "user@test.com", "Test User",
                        true, false, null, null, null));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "fullName", "Test User",
                                "email", "user@test.com",
                                "password", "Password1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.requiresEmailVerification").value(true))
                .andExpect(jsonPath("$.email").value("user@test.com"));
    }

    @Test
    void register_missingFields_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ── POST /api/auth/login ───────────────────────────────────────────────

    @Test
    void login_validCredentials_returns200WithJwtCookie() throws Exception {
        when(authService.login(any())).thenReturn(
                new AuthResponse("jwt-token", "user@test.com", "Test User",
                        false, false, null, null, null));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "email", "user@test.com",
                                "password", "Password1"))))
                .andExpect(status().isOk())
                // JWT must be in HttpOnly cookie (primary security requirement)
                .andExpect(header().string("Set-Cookie", containsString("jwt=")))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
                // Email and fullName are present in response body for UI state
                .andExpect(jsonPath("$.email").value("user@test.com"));
    }

    @Test
    void login_invalidCredentials_returns400() throws Exception {
        when(authService.login(any())).thenThrow(new RuntimeException("Invalid email or password"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "email", "user@test.com",
                                "password", "wrong"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_unverifiedEmail_returns200WithoutToken() throws Exception {
        when(authService.login(any())).thenReturn(
                new AuthResponse(null, "user@test.com", "Test User",
                        true, false, null, null, null));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "email", "user@test.com",
                                "password", "Password1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresEmailVerification").value(true))
                // No cookie should be set when no token
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    @Test
    void login_2faRequired_returns200WithTempToken() throws Exception {
        when(authService.login(any())).thenReturn(
                new AuthResponse(null, "user@test.com", "Test User",
                        false, true, "TOTP", "temp-token-xyz", null));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "email", "user@test.com",
                                "password", "Password1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.twoFactorRequired").value(true))
                .andExpect(jsonPath("$.twoFactorMethod").value("TOTP"))
                .andExpect(jsonPath("$.tempToken").value("temp-token-xyz"))
                // No session cookie yet — only temp token in body
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    // ── POST /api/auth/verify-email ────────────────────────────────────────

    @Test
    void verifyEmail_validOtp_returns200WithJwtCookie() throws Exception {
        doNothing().when(emailVerificationService).verifyOtp(anyString(), anyString());
        when(authService.loginAfterVerification("user@test.com")).thenReturn(
                new AuthResponse("full-jwt", "user@test.com", "Test User",
                        false, false, null, null, null));

        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "email", "user@test.com",
                                "otp", "123456"))))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", containsString("jwt=")))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")));
    }

    // ── POST /api/auth/forgot-password ────────────────────────────────────

    @Test
    void forgotPassword_anyEmail_alwaysReturns200() throws Exception {
        // Must never reveal if email exists (anti-enumeration)
        doNothing().when(passwordResetService).sendResetLink(anyString());

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("email", "anyone@test.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }

    // ── POST /api/auth/logout ──────────────────────────────────────────────

    @Test
    void logout_returns200AndClearsCookie() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk())
                // Cookie must be cleared (Max-Age=0)
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
    }

    // ── POST /api/auth/oauth/exchange ──────────────────────────────────────

    @Test
    void oauthExchange_missingCode_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/oauth/exchange")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void oauthExchange_invalidCode_returns400() throws Exception {
        org.springframework.cache.Cache cache = mock(org.springframework.cache.Cache.class);
        when(cacheManager.getCache("oauthCodeCache")).thenReturn(cache);
        when(cache.get(anyString())).thenReturn(null); // code not found

        mockMvc.perform(post("/api/auth/oauth/exchange")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("code", "bad-code"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid or expired code"));
    }

    @Test
    void oauthExchange_validCode_setsJwtCookieAndReturnsUserInfo() throws Exception {
        org.springframework.cache.Cache cache = mock(org.springframework.cache.Cache.class);
        org.springframework.cache.Cache.ValueWrapper wrapper =
                mock(org.springframework.cache.Cache.ValueWrapper.class);

        java.util.HashMap<String, String> payload = new java.util.HashMap<>();
        payload.put("token", "oauth-jwt-token");
        payload.put("email", "oauth@test.com");
        payload.put("fullName", "OAuth User");

        when(cacheManager.getCache("oauthCodeCache")).thenReturn(cache);
        when(cache.get("valid-code")).thenReturn(wrapper);
        when(wrapper.get()).thenReturn(payload);

        mockMvc.perform(post("/api/auth/oauth/exchange")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("code", "valid-code"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("oauth@test.com"))
                .andExpect(jsonPath("$.fullName").value("OAuth User"))
                .andExpect(header().string("Set-Cookie", containsString("jwt=")))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")));

        // Code must be evicted after one use
        verify(cache).evict("valid-code");
    }

    // ── POST /api/auth/resend-verification ────────────────────────────────

    @Test
    void resendVerification_missingEmail_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resendVerification_validEmail_returns200() throws Exception {
        doNothing().when(emailVerificationService).sendVerificationOtp(anyString());

        mockMvc.perform(post("/api/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("email", "user@test.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }
}
