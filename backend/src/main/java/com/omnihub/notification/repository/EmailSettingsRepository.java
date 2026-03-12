package com.omnihub.notification.repository;

import com.omnihub.notification.entity.EmailSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface EmailSettingsRepository extends JpaRepository<EmailSettings, Long> {
    Optional<EmailSettings> findByUserId(Long userId);

    @Query("SELECT e FROM EmailSettings e WHERE e.enabled = true AND HOUR(e.sendTime) = :hour AND MINUTE(e.sendTime) = :minute")
    List<EmailSettings> findAllEnabledAtTime(@Param("hour") int hour, @Param("minute") int minute);
}
