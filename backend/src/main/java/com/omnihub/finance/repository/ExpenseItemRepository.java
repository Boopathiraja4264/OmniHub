package com.omnihub.finance.repository;

import com.omnihub.finance.entity.ExpenseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ExpenseItemRepository extends JpaRepository<ExpenseItem, Long> {

    @Query("SELECT i FROM ExpenseItem i JOIN FETCH i.category WHERE i.category.id = :categoryId AND i.user.id = :userId ORDER BY i.name ASC")
    List<ExpenseItem> findByCategoryIdAndUserIdOrderByNameAsc(@Param("categoryId") Long categoryId, @Param("userId") Long userId);

    @Query("SELECT i FROM ExpenseItem i JOIN FETCH i.category WHERE i.user.id = :userId ORDER BY i.category.name ASC, i.name ASC")
    List<ExpenseItem> findAllByUserIdWithCategory(@Param("userId") Long userId);

    List<ExpenseItem> findByCategoryId(Long categoryId);
    boolean existsByCategoryIdAndUserIdAndName(Long categoryId, Long userId, String name);

    @Modifying
    @Query("DELETE FROM ExpenseItem i WHERE i.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}
