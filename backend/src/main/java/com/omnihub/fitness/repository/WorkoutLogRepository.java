package com.omnihub.fitness.repository;
import com.omnihub.fitness.entity.WorkoutLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
public interface WorkoutLogRepository extends JpaRepository<WorkoutLog, Long> {
    List<WorkoutLog> findByUserIdOrderByDateDesc(Long userId);
    Optional<WorkoutLog> findByUserIdAndDate(Long userId, LocalDate date);
}
