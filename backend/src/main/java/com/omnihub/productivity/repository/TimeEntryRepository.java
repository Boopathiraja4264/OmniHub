package com.omnihub.productivity.repository;

import com.omnihub.productivity.entity.TimeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TimeEntryRepository extends JpaRepository<TimeEntry, Long> {

    // Active (running) timer — ended_at IS NULL
    Optional<TimeEntry> findByUserIdAndEndedAtIsNull(Long userId);

    List<TimeEntry> findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(
            Long userId, LocalDateTime from, LocalDateTime to);

    @Query("SELECT COALESCE(SUM(e.durationMinutes), 0) FROM TimeEntry e WHERE e.user.id = :userId AND e.startedAt >= :from AND e.startedAt < :to AND e.endedAt IS NOT NULL")
    long sumDurationByUserAndDateRange(@Param("userId") Long userId,
                                       @Param("from") LocalDateTime from,
                                       @Param("to") LocalDateTime to);

    @Query("SELECT e.blockId, COALESCE(SUM(e.durationMinutes), 0) FROM TimeEntry e WHERE e.user.id = :userId AND e.startedAt >= :from AND e.startedAt < :to AND e.endedAt IS NOT NULL GROUP BY e.blockId")
    List<Object[]> sumDurationByBlockForRange(@Param("userId") Long userId,
                                               @Param("from") LocalDateTime from,
                                               @Param("to") LocalDateTime to);
}
