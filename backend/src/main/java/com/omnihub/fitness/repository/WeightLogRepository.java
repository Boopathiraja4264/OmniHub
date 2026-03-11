package com.omnihub.fitness.repository;
import com.omnihub.fitness.entity.WeightLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
public interface WeightLogRepository extends JpaRepository<WeightLog, Long> {
    List<WeightLog> findByUserIdOrderByDateDesc(Long userId);
    Optional<WeightLog> findByUserIdAndDate(Long userId, LocalDate date);
}
