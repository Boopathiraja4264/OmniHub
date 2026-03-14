package com.omnihub.backup.controller;

import com.omnihub.backup.entity.BackupLog;
import com.omnihub.backup.repository.BackupLogRepository;
import com.omnihub.backup.service.OneDriveBackupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/backup")
public class BackupController {

    @Autowired private OneDriveBackupService backupService;
    @Autowired private BackupLogRepository backupLogRepository;

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
    public ResponseEntity<BackupLog> runBackup() {
        return ResponseEntity.ok(backupService.performBackup());
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
}
