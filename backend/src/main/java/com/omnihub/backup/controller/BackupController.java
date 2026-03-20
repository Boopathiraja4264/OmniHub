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
import java.time.format.DateTimeParseException;
import java.util.*;

@RestController
@RequestMapping("/api/backup")
public class BackupController {

    @Autowired private OneDriveBackupService backupService;
    @Autowired private BackupLogRepository backupLogRepository;
    @Autowired private BackupSettingsRepository backupSettingsRepository;
    @Autowired private UserRepository userRepository;

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/logs")
    public ResponseEntity<List<BackupLog>> getLogs(Authentication auth) {
        Long userId = getUser(auth).getId();
        return ResponseEntity.ok(backupLogRepository.findByUserIdOrderByBackedUpAtDesc(userId));
    }

    @GetMapping("/latest")
    public ResponseEntity<?> getLatest(Authentication auth) {
        Long userId = getUser(auth).getId();
        return backupLogRepository.findTopByUserIdOrderByBackedUpAtDesc(userId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/run")
    public ResponseEntity<BackupLog> runBackup(Authentication auth) {
        User user = getUser(auth);
        return ResponseEntity.ok(backupService.performBackup(user.getId()));
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<String> download(@PathVariable Long id, Authentication auth) {
        Long userId = getUser(auth).getId();
        BackupLog log = backupLogRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Backup not found"));
        if (log.getUserId() == null || !log.getUserId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=backup.json")
            .body(backupService.downloadBackup(id));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(Authentication auth) {
        Long userId = getUser(auth).getId();
        List<BackupLog> all = backupLogRepository.findByUserIdOrderByBackedUpAtDesc(userId);
        long totalBytes = all.stream().filter(l -> l.getFileSizeBytes() != null)
            .mapToLong(BackupLog::getFileSizeBytes).sum();
        return ResponseEntity.ok(Map.of(
            "total", all.size(),
            "successful", all.stream().filter(l -> "SUCCESS".equals(l.getStatus())).count(),
            "failed", all.stream().filter(l -> "FAILED".equals(l.getStatus())).count(),
            "totalBytes", totalBytes,
            "latest", backupLogRepository.findTopByUserIdOrderByBackedUpAtDesc(userId).orElse(null)
        ));
    }

    @GetMapping("/settings")
    public ResponseEntity<BackupSettings> getSettings(Authentication auth) {
        User user = getUser(auth);
        return ResponseEntity.ok(backupSettingsRepository.findByUserId(user.getId())
            .orElseGet(() -> {
                BackupSettings s = new BackupSettings();
                s.setUser(user);
                return backupSettingsRepository.save(s);
            }));
    }

    @PutMapping("/settings")
    public ResponseEntity<?> updateSettings(Authentication auth, @RequestBody Map<String, Object> req) {
        User user = getUser(auth);
        BackupSettings s = backupSettingsRepository.findByUserId(user.getId())
            .orElseGet(() -> {
                BackupSettings ns = new BackupSettings();
                ns.setUser(user);
                return ns;
            });

        if (req.containsKey("enabled")) s.setEnabled((Boolean) req.get("enabled"));
        if (req.containsKey("backupTime")) {
            try {
                s.setBackupTime(LocalTime.parse((String) req.get("backupTime")));
            } catch (DateTimeParseException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid time format. Use HH:mm:ss"));
            }
        }

        return ResponseEntity.ok(backupSettingsRepository.save(s));
    }
}
