package com.omnihub.fitness.repository;
import com.omnihub.fitness.entity.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ExerciseRepository extends JpaRepository<Exercise, Long> {
    List<Exercise> findByUserId(Long userId);
}
