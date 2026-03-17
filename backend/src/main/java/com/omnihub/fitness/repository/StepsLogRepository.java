package com.omnihub.fitness.repository;

import com.omnihub.fitness.entity.StepsLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StepsLogRepository extends JpaRepository<StepsLog, Long> {

    List<StepsLog> findByUserIdOrderByDateDesc(Long userId);

    Optional<StepsLog> findByUserIdAndDate(Long userId, LocalDate date);
}
