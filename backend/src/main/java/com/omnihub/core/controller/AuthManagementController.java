package com.omnihub.core.controller;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.core.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthManagementController {

    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(Authentication auth,
                                             @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(auth.getName(), request.getCurrentPassword(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @PostMapping("/set-password")
    public ResponseEntity<?> setPassword(Authentication auth,
                                          @RequestBody Map<String, String> body) {
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters"));
        }
        authService.setPassword(auth.getName(), newPassword);
        return ResponseEntity.ok(Map.of("message", "Password set successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
        resp.put("email", user.getEmail());
        resp.put("fullName", user.getFullName());
        resp.put("emailVerified", user.isEmailVerified());
        resp.put("twoFactorMethod", user.getTwoFactorMethod());
        resp.put("oauthProvider", user.getOauthProvider() != null ? user.getOauthProvider() : "");
        resp.put("profilePicture", user.getProfilePicture() != null ? user.getProfilePicture() : "");
        return ResponseEntity.ok(resp);
    }

    @PatchMapping("/profile")
    public ResponseEntity<?> updateProfile(Authentication auth,
                                            @RequestBody Map<String, String> body) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        String name = body.get("fullName");
        if (name != null && !name.isBlank()) user.setFullName(name.trim());
        if (body.containsKey("profilePicture")) {
            String pic = body.get("profilePicture");
            user.setProfilePicture((pic != null && !pic.isBlank()) ? pic : null);
        }
        userRepository.save(user);
        java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
        resp.put("fullName", user.getFullName());
        resp.put("profilePicture", user.getProfilePicture() != null ? user.getProfilePicture() : "");
        return ResponseEntity.ok(resp);
    }
}
