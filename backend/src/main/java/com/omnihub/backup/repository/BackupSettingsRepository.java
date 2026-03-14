package com.omnihub.backup.repository;

import com.omnihub.backup.entity.BackupSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface BackupSettingsRepository extends JpaRepository<BackupSettings, Long> {
    Optional<BackupSettings> findByUserId(Long userId);
    Optional<BackupSettings> findByUserEmail(String email);

    @Query("SELECT b FROM BackupSettings b WHERE b.enabled = true AND HOUR(b.backupTime) = :hour AND MINUTE(b.backupTime) = :minute")
    List<BackupSettings> findAllEnabledAtTime(int hour, int minute);
}
