package com.omnihub.finance.entity;

import com.omnihub.core.security.EncryptedStringConverter;
import jakarta.persistence.*;
import com.omnihub.core.entity.User;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bank_accounts", indexes = {
    @Index(name = "idx_bank_acc_user", columnList = "user_id")
})
public class BankAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(nullable = false, length = 500)
    private String name;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 500)
    private String bankName;

    @Column(nullable = false)
    private String accountType; // SAVINGS, CURRENT, SALARY

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal openingBalance;

    @Column(name = "is_default", nullable = false, columnDefinition = "boolean not null default false")
    private boolean isDefault = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String v) { name = v; }
    public String getBankName() { return bankName; }
    public void setBankName(String v) { bankName = v; }
    public String getAccountType() { return accountType; }
    public void setAccountType(String v) { accountType = v; }
    public BigDecimal getOpeningBalance() { return openingBalance; }
    public void setOpeningBalance(BigDecimal v) { openingBalance = v; }
    public boolean isDefault() { return isDefault; }
    public void setDefault(boolean v) { isDefault = v; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
