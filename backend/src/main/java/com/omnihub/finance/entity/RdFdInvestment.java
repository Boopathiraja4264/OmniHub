package com.omnihub.finance.entity;

import com.omnihub.core.entity.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "rd_fd_investments", indexes = {
    @Index(name = "idx_rdfd_user", columnList = "user_id")
})
public class RdFdInvestment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String type; // "RD" | "FD"

    @Column(nullable = false)
    private String name;

    private String bankName;

    // FD: lump-sum principal  |  RD: monthly installment amount
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    // Annual interest rate as % (e.g. 6.5 means 6.5%)
    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal annualInterestRate;

    @Column(nullable = false)
    private Integer tenureMonths;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private boolean isEmergencyFund = false;

    @Column(nullable = false)
    private String status = "ACTIVE"; // ACTIVE | MATURED | CLOSED

    @Column(columnDefinition = "TEXT")
    private String notes;

    // ── getters / setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public String getType() { return type; }
    public void setType(String v) { type = v; }
    public String getName() { return name; }
    public void setName(String v) { name = v; }
    public String getBankName() { return bankName; }
    public void setBankName(String v) { bankName = v; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal v) { amount = v; }
    public BigDecimal getAnnualInterestRate() { return annualInterestRate; }
    public void setAnnualInterestRate(BigDecimal v) { annualInterestRate = v; }
    public Integer getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(Integer v) { tenureMonths = v; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate v) { startDate = v; }
    public boolean isEmergencyFund() { return isEmergencyFund; }
    public void setEmergencyFund(boolean v) { isEmergencyFund = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { status = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { notes = v; }
}
