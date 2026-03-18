package com.omnihub.finance.repository;

import com.omnihub.finance.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long> {
    List<Budget> findByUserIdAndMonthNumberAndYear(Long userId, int monthNumber, int year);

    List<Budget> findByUserId(Long userId);

    Optional<Budget> findByUserIdAndCategoryAndMonthNumberAndYear(Long userId, String category, int monthNumber,
            int year);

    List<Budget> findByUserIdAndYear(Long userId, int year);
}
