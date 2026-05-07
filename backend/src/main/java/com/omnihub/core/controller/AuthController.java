package com.omnihub.core.controller;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.security.JwtUtil;
import com.omnihub.core.service.AuthService;
import com.omnihub.core.service.EmailVerificationService;
import com.omnihub.core.service.PasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private AuthService authService;
    @Autowired private EmailVerificationService emailVerificationService;
    @Autowired private PasswordResetService passwordResetService;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CacheManager cacheManager;
    @Autowired private ClientRegistrationRepository clientRegistrationRepository;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    // ── Registration & Login ───────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletResponse response) {
        AuthResponse auth = authService.login(request);
        if (auth.getToken() != null) setJwtCookie(response, auth.getToken());
        return ResponseEntity.ok(auth);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@Valid @RequestBody VerifyEmailRequest request,
                                          HttpServletResponse response) {
        emailVerificationService.verifyOtp(request.getEmail(), request.getOtp());
        AuthResponse auth = authService.loginAfterVerification(request.getEmail());
        if (auth.getToken() != null) setJwtCookie(response, auth.getToken());
        return ResponseEntity.ok(auth);
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody Map<String, String> req) {
        String email = req.get("email");
        if (email == null || email.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Email required"));
        emailVerificationService.sendVerificationOtp(email);
        return ResponseEntity.ok(Map.of("message", "Verification code resent"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.sendResetLink(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "If that email exists, a reset link has been sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    @PostMapping("/2fa/verify")
    public ResponseEntity<AuthResponse> verify2FA(@RequestBody TwoFactorChallengeRequest request,
                                                   HttpServletResponse response) {
        AuthResponse auth = authService.verify2FA(
                request.getTempToken(), request.getCode(),
                request.getMethod(), request.getChallengeToken());
        if (auth.getToken() != null) setJwtCookie(response, auth.getToken());
        return ResponseEntity.ok(auth);
    }

    // ── SSO provider discovery ─────────────────────────────────────────────────

    @GetMapping("/sso-providers")
    public ResponseEntity<?> getSsoProviders() {
        List<String> providers = new ArrayList<>();
        if (clientRegistrationRepository instanceof Iterable<?> iterable) {
            for (Object obj : iterable) {
                if (obj instanceof ClientRegistration reg) {
                    providers.add(reg.getRegistrationId());
                }
            }
        }
        return ResponseEntity.ok(Map.of("providers", providers));
    }

    // ── Session management ─────────────────────────────────────────────────────

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        // Revoke the current token (cookie or header)
        String token = extractToken(request);
        if (token != null) jwtUtil.revokeToken(token);

        // Clear the cookie
        clearJwtCookie(response);
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    // ── OAuth one-time code exchange ───────────────────────────────────────────

    @PostMapping("/oauth/exchange")
    public ResponseEntity<?> exchangeOauthCode(@RequestBody Map<String, String> req,
                                                HttpServletResponse response) {
        String code = req.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing code"));
        }

        Cache cache = cacheManager.getCache("oauthCodeCache");
        if (cache == null) return ResponseEntity.internalServerError().build();

        Cache.ValueWrapper wrapper = cache.get(code);
        if (wrapper == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired code"));
        }

        Object raw = wrapper.get();
        if (raw == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired code"));
        }
        @SuppressWarnings("unchecked")
        Map<String, String> payload = (Map<String, String>) raw;
        cache.evict(code); // one-time use

        String token = payload.get("token");
        setJwtCookie(response, token);

        String email = String.valueOf(payload.getOrDefault("email", ""));
        String fullName = String.valueOf(payload.getOrDefault("fullName", ""));
        String oauthProvider = String.valueOf(payload.getOrDefault("oauthProvider", ""));
        return ResponseEntity.ok(Map.of(
                "email", email,
                "fullName", fullName,
                "oauthProvider", oauthProvider
        ));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private void setJwtCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from("jwt", token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .maxAge(86400)
                .path("/")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearJwtCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("jwt", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .maxAge(0)
                .path("/")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String extractToken(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie c : request.getCookies()) {
                if ("jwt".equals(c.getName())) return c.getValue();
            }
        }
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) return header.substring(7);
        return null;
    }
}
