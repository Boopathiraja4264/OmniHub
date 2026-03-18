package com.omnihub.finance.repository;

import com.omnihub.finance.entity.Transaction;
import com.omnihub.finance.entity.Transaction.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserIdOrderByDateDesc(Long userId);

    List<Transaction> findTop10ByUserIdOrderByDateDesc(Long userId);

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

    @Query("SELECT t.category, MONTH(t.date), SUM(t.amount) FROM Transaction t WHERE t.user.id = :userId AND t.type = 'EXPENSE' AND YEAR(t.date) = :year GROUP BY t.category, MONTH(t.date) ORDER BY t.category, MONTH(t.date)")
    List<Object[]> sumExpensesByCategoryAndMonthForYear(@Param("userId") Long userId, @Param("year") int year);

    @Query("SELECT t.itemName, SUM(t.amount) FROM Transaction t WHERE t.user.id = :userId AND t.type = 'EXPENSE' AND MONTH(t.date) = :month AND YEAR(t.date) = :year AND t.itemName IS NOT NULL GROUP BY t.itemName ORDER BY SUM(t.amount) DESC")
    List<Object[]> topItemsBySpend(@Param("userId") Long userId, @Param("month") int month, @Param("year") int year);

    @Query("SELECT t.cardId, SUM(t.amount) FROM Transaction t WHERE t.user.id = :userId AND t.paymentSource = 'CREDIT_CARD' AND MONTH(t.date) = :month AND YEAR(t.date) = :year AND t.cardId IS NOT NULL GROUP BY t.cardId")
    List<Object[]> spendByCard(@Param("userId") Long userId, @Param("month") int month, @Param("year") int year);

    List<Transaction> findByUserIdAndBankAccountIdOrderByDateAscIdAsc(Long userId, Long bankAccountId);

    List<Transaction> findByUserIdAndCardIdOrderByDateAscIdAsc(Long userId, Long cardId);

    // Bank account balance: sum by account and type
    @Query("SELECT SUM(t.amount) FROM Transaction t WHERE t.user.id = :userId AND t.bankAccountId = :bankAccountId AND t.type = :type")
    BigDecimal sumByBankAccountIdAndType(@Param("userId") Long userId, @Param("bankAccountId") Long bankAccountId, @Param("type") TransactionType type);

    // Credit card billing cycle outstanding: all expenses from a date onwards
    @Query("SELECT SUM(t.amount) FROM Transaction t WHERE t.user.id = :userId AND t.cardId = :cardId AND t.type = 'EXPENSE' AND t.date >= :fromDate")
    BigDecimal sumCardOutstandingFromDate(@Param("userId") Long userId, @Param("cardId") Long cardId, @Param("fromDate") LocalDate fromDate);

    // Summary pivot: category, itemName, month, total — for annual summary export
    @Query("SELECT t.category, t.itemName, MONTH(t.date), SUM(t.amount) " +
           "FROM Transaction t WHERE t.user.id = :userId AND t.type = 'EXPENSE' AND YEAR(t.date) = :year " +
           "GROUP BY t.category, t.itemName, MONTH(t.date) ORDER BY t.category, COALESCE(t.itemName,''), MONTH(t.date)")
    List<Object[]> getExpensesByItemAndMonth(@Param("userId") Long userId, @Param("year") int year);
}
