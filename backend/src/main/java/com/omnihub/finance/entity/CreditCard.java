package com.omnihub.finance.entity;

import com.omnihub.core.security.EncryptedStringConverter;
import jakarta.persistence.*;
import com.omnihub.core.entity.User;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "credit_cards", indexes = {
    @Index(name = "idx_card_user", columnList = "user_id")
})
public class CreditCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(nullable = false, length = 500)
    private String name;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 500)
    private String bank;

    @Column(precision = 12, scale = 2)
    private BigDecimal creditLimit;

    /** Day of month when statement is generated (billing cycle resets) */
    private Integer billingDate;

    /** Day of month when payment is due */
    private Integer paymentDueDate;

    /** Last 4 digits of the card number */
    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 200)
    private String lastFourDigits;

    /** VISA, MASTERCARD, RUPAY, AMEX, DISCOVER, OTHER */
    private String cardType;

    @Column(name = "balance_date")
    private LocalDate balanceDate;

    @Column(precision = 12, scale = 2)
    private BigDecimal openingOutstanding;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public CreditCard() {}

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String v) { name = v; }
    public String getBank() { return bank; }
    public void setBank(String v) { bank = v; }
    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal v) { creditLimit = v; }
    public Integer getBillingDate() { return billingDate; }
    public void setBillingDate(Integer v) { billingDate = v; }
    public Integer getPaymentDueDate() { return paymentDueDate; }
    public void setPaymentDueDate(Integer v) { paymentDueDate = v; }
    public String getLastFourDigits() { return lastFourDigits; }
    public void setLastFourDigits(String v) { lastFourDigits = v; }
    public String getCardType() { return cardType; }
    public void setCardType(String v) { cardType = v; }
    public LocalDate getBalanceDate() { return balanceDate; }
    public void setBalanceDate(LocalDate v) { balanceDate = v; }
    public BigDecimal getOpeningOutstanding() { return openingOutstanding; }
    public void setOpeningOutstanding(BigDecimal v) { openingOutstanding = v; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
