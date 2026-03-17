package com.omnihub.backup.controller;

import com.omnihub.backup.entity.BackupLog;
import com.omnihub.backup.entity.BackupSettings;
import com.omnihub.backup.repository.BackupLogRepository;
import com.omnihub.backup.repository.BackupSettingsRepository;
import com.omnihub.backup.service.OneDriveBackupService;
import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalTime;
import java.util.*;

@RestController
@RequestMapping("/api/backup")
public class BackupController {

    @Autowired private OneDriveBackupService backupService;
    @Autowired private BackupLogRepository backupLogRepository;
    @Autowired private BackupSettingsRepository backupSettingsRepository;
    @Autowired private UserRepository userRepository;

    @GetMapping("/logs")
    public ResponseEntity<List<BackupLog>> getLogs() {
        return ResponseEntity.ok(backupLogRepository.findAllByOrderByBackedUpAtDesc());
    }

    @GetMapping("/latest")
    public ResponseEntity<?> getLatest() {
        return backupLogRepository.findTopByOrderByBackedUpAtDesc()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/run")
    public ResponseEntity<BackupLog> runBackup(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(backupService.performBackup(user.getId()));
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<String> download(@PathVariable Long id) {
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=backup.json")
            .body(backupService.downloadBackup(id));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        List<BackupLog> all = backupLogRepository.findAllByOrderByBackedUpAtDesc();
        long totalBytes = all.stream().filter(l -> l.getFileSizeBytes() != null)
            .mapToLong(BackupLog::getFileSizeBytes).sum();
        return ResponseEntity.ok(Map.of(
            "total", all.size(),
            "successful", all.stream().filter(l -> "SUCCESS".equals(l.getStatus())).count(),
            "failed", all.stream().filter(l -> "FAILED".equals(l.getStatus())).count(),
            "totalBytes", totalBytes,
            "latest", backupLogRepository.findTopByOrderByBackedUpAtDesc().orElse(null)
        ));
    }

    @GetMapping("/settings")
    public ResponseEntity<BackupSettings> getSettings(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(backupSettingsRepository.findByUserId(user.getId())
            .orElseGet(() -> {
                BackupSettings s = new BackupSettings();
                s.setUser(user);
                return backupSettingsRepository.save(s);
            }));
    }

    @PutMapping("/settings")
    public ResponseEntity<BackupSettings> updateSettings(Authentication auth, @RequestBody Map<String, Object> req) {
        User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
        BackupSettings s = backupSettingsRepository.findByUserId(user.getId())
            .orElseGet(() -> {
                BackupSettings ns = new BackupSettings();
                ns.setUser(user);
                return ns;
            });
        
        if (req.containsKey("enabled")) s.setEnabled((Boolean) req.get("enabled"));
        if (req.containsKey("backupTime")) {
            s.setBackupTime(LocalTime.parse((String) req.get("backupTime")));
        }
        
        return ResponseEntity.ok(backupSettingsRepository.save(s));
    }
}
