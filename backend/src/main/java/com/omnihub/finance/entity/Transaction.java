package com.omnihub.finance.entity;

import com.omnihub.core.security.EncryptedStringConverter;
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

    @Convert(converter = EncryptedStringConverter.class)
    @Column(nullable = false, length = 1000)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private LocalDate date;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 1000)
    private String notes;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 500)
    private String itemName;

    @Enumerated(EnumType.STRING)
    private PaymentSource paymentSource;

    private Long cardId;
    private Long bankAccountId;
    private Integer kmReading;
    private Long vehicleId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public enum TransactionType { INCOME, EXPENSE }

    public Transaction() {}

    public static TransactionBuilder builder() { return new TransactionBuilder(); }

    public static class TransactionBuilder {
        private Long id, cardId, bankAccountId, vehicleId;
        private String description, category, notes, itemName;
        private BigDecimal amount;
        private TransactionType type;
        private LocalDate date;
        private User user;
        private PaymentSource paymentSource;
        private Integer kmReading;

        public TransactionBuilder id(Long v) { id = v; return this; }
        public TransactionBuilder description(String v) { description = v; return this; }
        public TransactionBuilder amount(BigDecimal v) { amount = v; return this; }
        public TransactionBuilder type(TransactionType v) { type = v; return this; }
        public TransactionBuilder category(String v) { category = v; return this; }
        public TransactionBuilder date(LocalDate v) { date = v; return this; }
        public TransactionBuilder notes(String v) { notes = v; return this; }
        public TransactionBuilder itemName(String v) { itemName = v; return this; }
        public TransactionBuilder user(User v) { user = v; return this; }
        public TransactionBuilder paymentSource(PaymentSource v) { paymentSource = v; return this; }
        public TransactionBuilder cardId(Long v) { cardId = v; return this; }
        public TransactionBuilder bankAccountId(Long v) { bankAccountId = v; return this; }
        public TransactionBuilder kmReading(Integer v) { kmReading = v; return this; }
        public TransactionBuilder vehicleId(Long v) { vehicleId = v; return this; }

        public Transaction build() {
            Transaction t = new Transaction();
            t.id = id; t.description = description; t.amount = amount; t.type = type;
            t.category = category; t.date = date; t.notes = notes; t.itemName = itemName;
            t.user = user; t.paymentSource = paymentSource; t.cardId = cardId;
            t.bankAccountId = bankAccountId; t.kmReading = kmReading; t.vehicleId = vehicleId;
            return t;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDescription() { return description; }
    public void setDescription(String v) { description = v; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal v) { amount = v; }
    public TransactionType getType() { return type; }
    public void setType(TransactionType v) { type = v; }
    public String getCategory() { return category; }
    public void setCategory(String v) { category = v; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate v) { date = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { notes = v; }
    public String getItemName() { return itemName; }
    public void setItemName(String v) { itemName = v; }
    public PaymentSource getPaymentSource() { return paymentSource; }
    public void setPaymentSource(PaymentSource v) { paymentSource = v; }
    public Long getCardId() { return cardId; }
    public void setCardId(Long v) { cardId = v; }
    public Long getBankAccountId() { return bankAccountId; }
    public void setBankAccountId(Long v) { bankAccountId = v; }
    public Integer getKmReading() { return kmReading; }
    public void setKmReading(Integer v) { kmReading = v; }
    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long v) { vehicleId = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
}
