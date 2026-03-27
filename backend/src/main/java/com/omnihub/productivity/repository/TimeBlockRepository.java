package com.omnihub.productivity.repository;

import com.omnihub.productivity.entity.TimeBlock;
import com.omnihub.productivity.entity.TimeBlock.BlockStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TimeBlockRepository extends JpaRepository<TimeBlock, Long> {

    List<TimeBlock> findByDailyPlanIdOrderByStartTimeAsc(Long planId);

    @Query("SELECT COUNT(b) FROM TimeBlock b WHERE b.dailyPlan.id = :planId")
    long countByPlanId(@Param("planId") Long planId);

    @Query("SELECT COUNT(b) FROM TimeBlock b WHERE b.dailyPlan.id = :planId AND b.status = :status")
    long countByPlanIdAndStatus(@Param("planId") Long planId, @Param("status") BlockStatus status);

    @Query("SELECT COALESCE(SUM(FUNCTION('TIMESTAMPDIFF', MINUTE, b.startTime, b.endTime)), 0) FROM TimeBlock b WHERE b.dailyPlan.id = :planId")
    long sumPlannedMinutesByPlanId(@Param("planId") Long planId);

    void deleteByDailyPlanIdAndStatus(Long planId, BlockStatus status);
}
