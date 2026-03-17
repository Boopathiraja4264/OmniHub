package com.omnihub.notification.repository;

import com.omnihub.notification.entity.SmsSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SmsSettingsRepository extends JpaRepository<SmsSettings, Long> {

    Optional<SmsSettings> findByUserId(Long userId);

    @Query("SELECT s FROM SmsSettings s WHERE s.enabled = true AND s.phoneNumber IS NOT NULL AND (" +
           "(HOUR(s.sendTime1) = :hour AND MINUTE(s.sendTime1) = :minute) OR " +
           "(s.sendTime2 IS NOT NULL AND HOUR(s.sendTime2) = :hour AND MINUTE(s.sendTime2) = :minute))")
    List<SmsSettings> findAllEnabledAtTime(@Param("hour") int hour, @Param("minute") int minute);
}
