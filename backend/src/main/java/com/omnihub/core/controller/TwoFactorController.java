package com.omnihub.core.controller;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.core.service.TwoFactorService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/2fa")
public class TwoFactorController {

    @Autowired private TwoFactorService twoFactorService;
    @Autowired private UserRepository userRepository;

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus(Authentication auth) {
        User user = getUser(auth);
        long backupCodesRemaining = 0;
        if (user.getTotpBackupCodes() != null) {
            backupCodesRemaining = java.util.Arrays.stream(user.getTotpBackupCodes().split(";"))
                    .filter(s -> !s.isBlank()).count();
        }
        return ResponseEntity.ok(Map.of(
                "method", user.getTwoFactorMethod(),
                "totpEnabled", user.isTotpEnabled(),
                "backupCodesRemaining", backupCodesRemaining
        ));
    }

    @PostMapping("/setup/totp")
    public ResponseEntity<?> setupTotp(Authentication auth) {
        User user = getUser(auth);
        return ResponseEntity.ok(twoFactorService.setupTotp(user.getId()));
    }

    @PostMapping("/setup/verify")
    public ResponseEntity<?> verifyTotpSetup(Authentication auth, @Valid @RequestBody Verify2FASetupRequest request) {
        User user = getUser(auth);
        java.util.List<String> backupCodes = twoFactorService.confirmTotpSetup(user.getId(), request.getCode());
        return ResponseEntity.ok(Map.of(
                "message", "TOTP 2FA enabled successfully",
                "backupCodes", backupCodes
        ));
    }

    @PostMapping("/setup/email-otp")
    public ResponseEntity<?> setupEmailOtp(Authentication auth) {
        User user = getUser(auth);
        user.setTwoFactorMethod("EMAIL_OTP");
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Email OTP 2FA enabled"));
    }

    @PostMapping("/setup/sms-otp")
    public ResponseEntity<?> setupSmsOtp(Authentication auth) {
        User user = getUser(auth);
        user.setTwoFactorMethod("SMS_OTP");
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "SMS OTP 2FA enabled"));
    }

    @PostMapping("/setup/push")
    public ResponseEntity<?> setupPush(Authentication auth) {
        User user = getUser(auth);
        user.setTwoFactorMethod("PUSH");
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Push approval 2FA enabled"));
    }

    @DeleteMapping("/disable")
    public ResponseEntity<?> disable2FA(Authentication auth) {
        User user = getUser(auth);
        twoFactorService.disable2FA(user.getId());
        return ResponseEntity.ok(Map.of("message", "2FA disabled"));
    }

    @GetMapping("/push/poll/{challengeToken}")
    public ResponseEntity<?> pollPush(@PathVariable String challengeToken, Authentication auth) {
        User user = getUser(auth);
        String status = twoFactorService.pollPushStatus(user.getId(), challengeToken);
        return ResponseEntity.ok(Map.of("status", status));
    }

    @PostMapping("/push/approve/{challengeToken}")
    public ResponseEntity<?> approvePush(@PathVariable String challengeToken, Authentication auth) {
        User user = getUser(auth);
        twoFactorService.approvePushChallenge(user.getId(), challengeToken);
        return ResponseEntity.ok(Map.of("message", "Approved"));
    }

    @PostMapping("/push/deny/{challengeToken}")
    public ResponseEntity<?> denyPush(@PathVariable String challengeToken, Authentication auth) {
        User user = getUser(auth);
        twoFactorService.denyPushChallenge(user.getId(), challengeToken);
        return ResponseEntity.ok(Map.of("message", "Denied"));
    }
}
