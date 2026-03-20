package com.omnihub.core.controller;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.service.AuthService;
import com.omnihub.core.service.EmailVerificationService;
import com.omnihub.core.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private AuthService authService;
    @Autowired private EmailVerificationService emailVerificationService;
    @Autowired private PasswordResetService passwordResetService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        emailVerificationService.verifyOtp(request.getEmail(), request.getOtp());
        // After verification, do a login without password (email already verified)
        var user = authService.loginAfterVerification(request.getEmail());
        return ResponseEntity.ok(user);
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
    public ResponseEntity<AuthResponse> verify2FA(@RequestBody TwoFactorChallengeRequest request) {
        return ResponseEntity.ok(authService.verify2FA(
                request.getTempToken(), request.getCode(),
                request.getMethod(), request.getChallengeToken()));
    }
}
