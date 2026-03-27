package com.omnihub.productivity.repository;

import com.omnihub.productivity.entity.FocusScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FocusScoreRepository extends JpaRepository<FocusScore, Long> {

    Optional<FocusScore> findByUserIdAndScoreDate(Long userId, LocalDate scoreDate);

    List<FocusScore> findByUserIdAndScoreDateBetweenOrderByScoreDateAsc(Long userId, LocalDate from, LocalDate to);

    @Query("SELECT f.scoreDate, AVG(f.totalScore) FROM FocusScore f WHERE f.user.id = :userId AND YEAR(f.scoreDate) = :year GROUP BY WEEK(f.scoreDate) ORDER BY f.scoreDate ASC")
    List<Object[]> weeklyAvgByYear(@Param("userId") Long userId, @Param("year") int year);

    @Query("SELECT MONTH(f.scoreDate), AVG(f.totalScore) FROM FocusScore f WHERE f.user.id = :userId AND YEAR(f.scoreDate) = :year GROUP BY MONTH(f.scoreDate) ORDER BY MONTH(f.scoreDate) ASC")
    List<Object[]> monthlyAvgByYear(@Param("userId") Long userId, @Param("year") int year);

    Optional<FocusScore> findTopByUserIdAndScoreDateBeforeOrderByScoreDateDesc(Long userId, LocalDate before);
}
