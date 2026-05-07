package com.omnihub.finance.entity;

import com.omnihub.core.entity.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "annual_loans", indexes = {
    @Index(name = "idx_annual_loan_user", columnList = "user_id")
})
public class AnnualLoan {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String loanId;          // GL001, GL002

    @Column(nullable = false)
    private String name;            // "TMB Gold Loan"

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal initialPrincipal;

    @Column(nullable = false, precision = 8, scale = 6)
    private BigDecimal annualInterestRate; // 0.099

    @Column(nullable = false)
    private LocalDate startDate;

    @Column
    private LocalDate endDate;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private LoanStatus status;      // OUTSTANDING, REPAID

    @Column(precision = 14, scale = 2)
    private BigDecimal currentBalance;  // outstanding principal

    @Column(precision = 14, scale = 2)
    private BigDecimal totalInterestAccrued;

    @Column(precision = 14, scale = 2)
    private BigDecimal interestPaid;

    @Column
    private String notes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "annualLoan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("paymentDate ASC")
    private List<PrepaymentEntry> prepayments = new ArrayList<>();

    public enum LoanStatus { OUTSTANDING, REPAID }

    // ── Getters / Setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public String getLoanId() { return loanId; }
    public void setLoanId(String v) { loanId = v; }
    public String getName() { return name; }
    public void setName(String v) { name = v; }
    public BigDecimal getInitialPrincipal() { return initialPrincipal; }
    public void setInitialPrincipal(BigDecimal v) { initialPrincipal = v; }
    public BigDecimal getAnnualInterestRate() { return annualInterestRate; }
    public void setAnnualInterestRate(BigDecimal v) { annualInterestRate = v; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate v) { startDate = v; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate v) { endDate = v; }
    public LoanStatus getStatus() { return status; }
    public void setStatus(LoanStatus v) { status = v; }
    public BigDecimal getCurrentBalance() { return currentBalance; }
    public void setCurrentBalance(BigDecimal v) { currentBalance = v; }
    public BigDecimal getTotalInterestAccrued() { return totalInterestAccrued; }
    public void setTotalInterestAccrued(BigDecimal v) { totalInterestAccrued = v; }
    public BigDecimal getInterestPaid() { return interestPaid; }
    public void setInterestPaid(BigDecimal v) { interestPaid = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { notes = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<PrepaymentEntry> getPrepayments() { return prepayments; }
    public void setPrepayments(List<PrepaymentEntry> v) { prepayments = v; }
}
