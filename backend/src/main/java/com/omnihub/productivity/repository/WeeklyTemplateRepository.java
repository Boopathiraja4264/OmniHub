package com.omnihub.productivity.repository;

import com.omnihub.productivity.entity.WeeklyTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WeeklyTemplateRepository extends JpaRepository<WeeklyTemplate, Long> {

    List<WeeklyTemplate> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<WeeklyTemplate> findFirstByUserIdAndActiveTrue(Long userId);
}
