package com.omnihub.fitness.repository;

import com.omnihub.fitness.entity.WeightGoalWeek;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WeightGoalWeekRepository extends JpaRepository<WeightGoalWeek, Long> {
    List<WeightGoalWeek> findByUserId(Long userId);
    Optional<WeightGoalWeek> findByUserIdAndWeekNumber(Long userId, Integer weekNumber);
}
