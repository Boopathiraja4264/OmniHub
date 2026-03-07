package com.financetracker.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "budgets")
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String category;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal limitAmount;
    // avoid using reserved word "month" in SQL; use month_number instead
    @Column(name = "month_number", nullable = false)
    private Integer monthNumber;
    // 'year' is reserved in H2, map to year_number column instead
    @Column(name = "year_number", nullable = false)
    private Integer year;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public Budget() {
    }

    public static BudgetBuilder builder() {
        return new BudgetBuilder();
    }

    public static class BudgetBuilder {
        private String category;
        private BigDecimal limitAmount;
        private Integer monthNumber, year;
        private User user;

        public BudgetBuilder category(String v) {
            category = v;
            return this;
        }

        public BudgetBuilder limitAmount(BigDecimal v) {
            limitAmount = v;
            return this;
        }

        public BudgetBuilder monthNumber(Integer v) {
            monthNumber = v;
            return this;
        }

        public BudgetBuilder year(Integer v) {
            year = v;
            return this;
        }

        public BudgetBuilder user(User v) {
            user = v;
            return this;
        }

        public Budget build() {
            Budget b = new Budget();
            b.category = category;
            b.limitAmount = limitAmount;
            b.monthNumber = monthNumber;
            b.year = year;
            b.user = user;
            return b;
        }
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String v) {
        category = v;
    }

    public BigDecimal getLimitAmount() {
        return limitAmount;
    }

    public void setLimitAmount(BigDecimal v) {
        limitAmount = v;
    }

    public Integer getMonthNumber() {
        return monthNumber;
    }

    public void setMonthNumber(Integer v) {
        monthNumber = v;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer v) {
        year = v;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User v) {
        user = v;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
