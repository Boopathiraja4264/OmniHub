package com.omnihub.finance.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "prepayment_entries", indexes = {
    @Index(name = "idx_prepayment_loan", columnList = "annual_loan_id")
})
public class PrepaymentEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "annual_loan_id", nullable = false)
    private AnnualLoan annualLoan;

    @Column(nullable = false)
    private LocalDate paymentDate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(precision = 12, scale = 4)
    private BigDecimal interestAccrued; // interest accrued up to this prepayment

    // ── Getters / Setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public AnnualLoan getAnnualLoan() { return annualLoan; }
    public void setAnnualLoan(AnnualLoan v) { annualLoan = v; }
    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate v) { paymentDate = v; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal v) { amount = v; }
    public BigDecimal getInterestAccrued() { return interestAccrued; }
    public void setInterestAccrued(BigDecimal v) { interestAccrued = v; }
}
