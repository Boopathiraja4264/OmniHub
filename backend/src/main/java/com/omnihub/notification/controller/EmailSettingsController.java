package com.omnihub.notification.controller;

import com.omnihub.notification.entity.EmailSettings;
import com.omnihub.notification.service.EmailSettingsService;
import com.omnihub.notification.service.EmailSettingsService.EmailSettingsRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class EmailSettingsController {

    @Autowired private EmailSettingsService emailSettingsService;

    @GetMapping("/email-settings")
    public ResponseEntity<EmailSettings> getSettings(Authentication auth) {
        return ResponseEntity.ok(emailSettingsService.getOrCreate(auth.getName()));
    }

    @PutMapping("/email-settings")
    public ResponseEntity<EmailSettings> updateSettings(Authentication auth, @RequestBody EmailSettingsRequest req) {
        return ResponseEntity.ok(emailSettingsService.update(auth.getName(), req));
    }

    @PostMapping("/email-settings/test")
    public ResponseEntity<String> sendTest(Authentication auth) {
        try {
            emailSettingsService.sendTest(auth.getName());
            return ResponseEntity.ok("✅ Test email sent successfully!");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("❌ Failed: " + e.getMessage());
        }
    }
}
