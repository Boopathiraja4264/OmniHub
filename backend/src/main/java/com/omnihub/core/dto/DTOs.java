package com.omnihub.core.dto;

import com.omnihub.finance.entity.Transaction.TransactionType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public class DTOs {

    public static class RegisterRequest {
        @NotBlank
        private String fullName;
        @Email
        @NotBlank
        private String email;
        @NotBlank
        @Size(min = 6)
        private String password;

        public String getFullName() {
            return fullName;
        }

        public void setFullName(String v) {
            fullName = v;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String v) {
            email = v;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String v) {
            password = v;
        }
    }

    public static class LoginRequest {
        @Email
        @NotBlank
        private String email;
        @NotBlank
        private String password;

        public String getEmail() {
            return email;
        }

        public void setEmail(String v) {
            email = v;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String v) {
            password = v;
        }
    }

    public static class AuthResponse {
        private String token, email, fullName;

        public AuthResponse(String token, String email, String fullName) {
            this.token = token;
            this.email = email;
            this.fullName = fullName;
        }

        public String getToken() {
            return token;
        }

        public String getEmail() {
            return email;
        }

        public String getFullName() {
            return fullName;
        }
    }

    public static class TransactionRequest {
        @NotBlank
        private String description;
        @NotNull
        @Positive
        private BigDecimal amount;
        @NotNull
        private TransactionType type;
        @NotBlank
        private String category;
        @NotNull
        private LocalDate date;
        private String notes;

        public String getDescription() {
            return description;
        }

        public void setDescription(String v) {
            description = v;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal v) {
            amount = v;
        }

        public TransactionType getType() {
            return type;
        }

        public void setType(TransactionType v) {
            type = v;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String v) {
            category = v;
        }

        public LocalDate getDate() {
            return date;
        }

        public void setDate(LocalDate v) {
            date = v;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String v) {
            notes = v;
        }
    }

    public static class TransactionResponse {
        private Long id;
        private String description, category, notes;
        private BigDecimal amount;
        private TransactionType type;
        private LocalDate date;

        public Long getId() {
            return id;
        }

        public void setId(Long v) {
            id = v;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String v) {
            description = v;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal v) {
            amount = v;
        }

        public TransactionType getType() {
            return type;
        }

        public void setType(TransactionType v) {
            type = v;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String v) {
            category = v;
        }

        public LocalDate getDate() {
            return date;
        }

        public void setDate(LocalDate v) {
            date = v;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String v) {
            notes = v;
        }
    }

    public static class BudgetRequest {
        @NotBlank
        private String category;
        @NotNull
        @Positive
        private BigDecimal limitAmount;
        @NotNull
        @Min(1)
        @Max(12)
        private Integer month;
        @NotNull
        private Integer year;

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

        public Integer getMonth() {
            return month;
        }

        public void setMonth(Integer v) {
            month = v;
        }

        public Integer getYear() {
            return year;
        }

        public void setYear(Integer v) {
            year = v;
        }
    }

    public static class BudgetResponse {
        private Long id;
        private String category;
        private BigDecimal limitAmount, spent;
        private Integer month, year;

        public Long getId() {
            return id;
        }

        public void setId(Long v) {
            id = v;
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

        public BigDecimal getSpent() {
            return spent;
        }

        public void setSpent(BigDecimal v) {
            spent = v;
        }

        public Integer getMonth() {
            return month;
        }

        public void setMonth(Integer v) {
            month = v;
        }

        public Integer getYear() {
            return year;
        }

        public void setYear(Integer v) {
            year = v;
        }
    }

    public static class SummaryResponse {
        private BigDecimal totalIncome, totalExpenses, balance, monthlyIncome, monthlyExpenses;

        public BigDecimal getTotalIncome() {
            return totalIncome;
        }

        public void setTotalIncome(BigDecimal v) {
            totalIncome = v;
        }

        public BigDecimal getTotalExpenses() {
            return totalExpenses;
        }

        public void setTotalExpenses(BigDecimal v) {
            totalExpenses = v;
        }

        public BigDecimal getBalance() {
            return balance;
        }

        public void setBalance(BigDecimal v) {
            balance = v;
        }

        public BigDecimal getMonthlyIncome() {
            return monthlyIncome;
        }

        public void setMonthlyIncome(BigDecimal v) {
            monthlyIncome = v;
        }

        public BigDecimal getMonthlyExpenses() {
            return monthlyExpenses;
        }

        public void setMonthlyExpenses(BigDecimal v) {
            monthlyExpenses = v;
        }
    }
}
