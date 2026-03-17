package com.omnihub.notification.repository;

import com.omnihub.notification.entity.SlackSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SlackSettingsRepository extends JpaRepository<SlackSettings, Long> {

    Optional<SlackSettings> findByUserId(Long userId);

    @Query("SELECT s FROM SlackSettings s WHERE s.enabled = true AND s.webhookUrl IS NOT NULL AND (" +
           "(HOUR(s.sendTime1) = :hour AND MINUTE(s.sendTime1) = :minute) OR " +
           "(s.sendTime2 IS NOT NULL AND HOUR(s.sendTime2) = :hour AND MINUTE(s.sendTime2) = :minute))")
    List<SlackSettings> findAllEnabledAtTime(@Param("hour") int hour, @Param("minute") int minute);

    @Query("SELECT s FROM SlackSettings s WHERE s.enabled = true AND s.webhookUrl IS NOT NULL AND " +
           "HOUR(s.sendTime1) = :hour AND MINUTE(s.sendTime1) = :minute")
    List<SlackSettings> findAllEnabledAtTime1(@Param("hour") int hour, @Param("minute") int minute);

    @Query("SELECT s FROM SlackSettings s WHERE s.enabled = true AND s.webhookUrl IS NOT NULL AND " +
           "s.sendTime2 IS NOT NULL AND HOUR(s.sendTime2) = :hour AND MINUTE(s.sendTime2) = :minute")
    List<SlackSettings> findAllEnabledAtTime2(@Param("hour") int hour, @Param("minute") int minute);
}
