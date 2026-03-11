package com.omnihub.fitness.repository;
import com.omnihub.fitness.entity.WeeklyPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface WeeklyPlanRepository extends JpaRepository<WeeklyPlan, Long> {
    List<WeeklyPlan> findByUserId(Long userId);
    Optional<WeeklyPlan> findByUserIdAndDayOfWeek(Long userId, String dayOfWeek);
}
