package com.omnihub.finance.repository;

import com.omnihub.finance.entity.ExpenseCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, Long> {
    List<ExpenseCategory> findByUserIdOrderByNameAsc(Long userId);
    Optional<ExpenseCategory> findByUserIdAndName(Long userId, String name);
    long countByUserId(Long userId);

    @Modifying
    @Query("DELETE FROM ExpenseCategory c WHERE c.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}
