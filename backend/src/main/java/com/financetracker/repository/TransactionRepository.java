package com.financetracker.repository;

import com.financetracker.entity.Transaction;
import com.financetracker.entity.Transaction.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserIdOrderByDateDesc(Long userId);

    List<Transaction> findByUserIdAndDateBetweenOrderByDateDesc(Long userId, LocalDate start, LocalDate end);

    List<Transaction> findByUserIdAndTypeOrderByDateDesc(Long userId, TransactionType type);

    @Query("SELECT SUM(t.amount) FROM Transaction t WHERE t.user.id = :userId AND t.type = :type")
    BigDecimal sumByUserIdAndType(@Param("userId") Long userId, @Param("type") TransactionType type);

    @Query("SELECT SUM(t.amount) FROM Transaction t WHERE t.user.id = :userId AND t.type = :type AND MONTH(t.date) = :month AND YEAR(t.date) = :year")
    BigDecimal sumByUserIdAndTypeAndMonthAndYear(@Param("userId") Long userId, @Param("type") TransactionType type,
                                                  @Param("month") int month, @Param("year") int year);

    @Query("SELECT t.category, SUM(t.amount) FROM Transaction t WHERE t.user.id = :userId AND t.type = 'EXPENSE' AND MONTH(t.date) = :month AND YEAR(t.date) = :year GROUP BY t.category")
    List<Object[]> sumExpensesByCategoryForMonth(@Param("userId") Long userId, @Param("month") int month, @Param("year") int year);

    @Query("SELECT MONTH(t.date) as month, SUM(t.amount) FROM Transaction t WHERE t.user.id = :userId AND t.type = :type AND YEAR(t.date) = :year GROUP BY MONTH(t.date) ORDER BY MONTH(t.date)")
    List<Object[]> monthlyTotalsByType(@Param("userId") Long userId, @Param("type") TransactionType type, @Param("year") int year);

    List<Transaction> findByUserIdAndCategoryAndDateBetween(Long userId, String category, LocalDate start, LocalDate end);
}
