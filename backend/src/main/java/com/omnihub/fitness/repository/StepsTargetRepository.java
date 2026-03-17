package com.omnihub.fitness.repository;

import com.omnihub.fitness.entity.StepsTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StepsTargetRepository extends JpaRepository<StepsTarget, Long> {

    List<StepsTarget> findByUserIdOrderBySetDateDesc(Long userId);

    // Get the target active on a specific date (most recent target set on or before that date)
    @Query("SELECT t FROM StepsTarget t WHERE t.user.id = :userId AND t.setDate <= :date ORDER BY t.setDate DESC")
    List<StepsTarget> findActiveTargetForDate(@Param("userId") Long userId, @Param("date") LocalDate date);

    Optional<StepsTarget> findTopByUserIdOrderBySetDateDesc(Long userId);
}
