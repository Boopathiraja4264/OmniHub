package com.omnihub.backup.repository;

import com.omnihub.backup.entity.BackupLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BackupLogRepository extends JpaRepository<BackupLog, Long> {
    List<BackupLog> findAllByOrderByBackedUpAtDesc();
    Optional<BackupLog> findTopByOrderByBackedUpAtDesc();
}
