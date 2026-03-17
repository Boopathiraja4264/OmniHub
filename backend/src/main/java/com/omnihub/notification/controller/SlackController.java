package com.omnihub.notification.controller;

import com.omnihub.notification.entity.SlackSettings;
import com.omnihub.notification.service.SlackSettingsService;
import com.omnihub.notification.service.SlackSettingsService.SlackSettingsRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class SlackController {

    @Autowired private SlackSettingsService slackSettingsService;

    @GetMapping("/slack-settings")
    public ResponseEntity<SlackSettings> getSettings(Authentication auth) {
        return ResponseEntity.ok(slackSettingsService.getOrCreate(auth.getName()));
    }

    @PutMapping("/slack-settings")
    public ResponseEntity<SlackSettings> updateSettings(Authentication auth, @RequestBody SlackSettingsRequest req) {
        return ResponseEntity.ok(slackSettingsService.update(auth.getName(), req));
    }

    @PostMapping("/slack-settings/test")
    public ResponseEntity<String> sendTest(Authentication auth) {
        try {
            slackSettingsService.sendTest(auth.getName());
            return ResponseEntity.ok("✅ Test Slack message sent successfully!");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("❌ Failed: " + e.getMessage());
        }
    }
}
