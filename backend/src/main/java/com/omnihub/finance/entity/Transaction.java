package com.omnihub.finance.entity;

import jakarta.persistence.*;
import com.omnihub.core.entity.User;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions", indexes = {
    @Index(name = "idx_tx_user_date",      columnList = "user_id, date DESC"),
    @Index(name = "idx_tx_user_type",      columnList = "user_id, type"),
    @Index(name = "idx_tx_user_cat_month", columnList = "user_id, category")
})
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type; // INCOME or EXPENSE

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private LocalDate date;

    private String notes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum TransactionType {
        INCOME, EXPENSE
    }

    // constructors
    public Transaction() {
    }

    private Transaction(Long id, String description, BigDecimal amount, TransactionType type,
            String category, LocalDate date, String notes, LocalDateTime createdAt, User user) {
        this.id = id;
        this.description = description;
        this.amount = amount;
        this.type = type;
        this.category = category;
        this.date = date;
        this.notes = notes;
        this.createdAt = createdAt;
        this.user = user;
    }

    public static TransactionBuilder builder() {
        return new TransactionBuilder();
    }

    public static class TransactionBuilder {
        private Long id;
        private String description;
        private BigDecimal amount;
        private TransactionType type;
        private String category;
        private LocalDate date;
        private String notes;
        private User user;

        public TransactionBuilder id(Long v) {
            id = v;
            return this;
        }

        public TransactionBuilder description(String v) {
            description = v;
            return this;
        }

        public TransactionBuilder amount(BigDecimal v) {
            amount = v;
            return this;
        }

        public TransactionBuilder type(TransactionType v) {
            type = v;
            return this;
        }

        public TransactionBuilder category(String v) {
            category = v;
            return this;
        }

        public TransactionBuilder date(LocalDate v) {
            date = v;
            return this;
        }

        public TransactionBuilder notes(String v) {
            notes = v;
            return this;
        }

        public TransactionBuilder user(User v) {
            user = v;
            return this;
        }

        public Transaction build() {
            Transaction t = new Transaction();
            t.id = id;
            t.description = description;
            t.amount = amount;
            t.type = type;
            t.category = category;
            t.date = date;
            t.notes = notes;
            t.user = user;
            return t;
        }
    }

    // getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public TransactionType getType() {
        return type;
    }

    public void setType(TransactionType type) {
        this.type = type;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}
