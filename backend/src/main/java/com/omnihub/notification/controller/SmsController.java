package com.omnihub.notification.controller;

import com.omnihub.notification.entity.SmsSettings;
import com.omnihub.notification.service.SmsSettingsService;
import com.omnihub.notification.service.SmsSettingsService.SmsSettingsRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class SmsController {

    @Autowired private SmsSettingsService smsSettingsService;

    @GetMapping("/sms-settings")
    public ResponseEntity<SmsSettings> getSettings(Authentication auth) {
        return ResponseEntity.ok(smsSettingsService.getOrCreate(auth.getName()));
    }

    @PutMapping("/sms-settings")
    public ResponseEntity<SmsSettings> updateSettings(Authentication auth, @RequestBody SmsSettingsRequest req) {
        return ResponseEntity.ok(smsSettingsService.update(auth.getName(), req));
    }

    @PostMapping("/sms-settings/test")
    public ResponseEntity<String> sendTest(Authentication auth) {
        try {
            smsSettingsService.sendTest(auth.getName());
            return ResponseEntity.ok("✅ Test SMS sent successfully!");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("❌ Failed: " + e.getMessage());
        }
    }
}
