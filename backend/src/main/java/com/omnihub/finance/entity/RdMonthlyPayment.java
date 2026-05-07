package com.omnihub.finance.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "rd_monthly_payments", indexes = {
    @Index(name = "idx_rdpay_investment", columnList = "investment_id")
})
public class RdMonthlyPayment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "investment_id", nullable = false)
    private RdFdInvestment investment;

    @Column(nullable = false)
    private Integer monthNumber;

    private LocalDate paymentDate;

    @Column(precision = 14, scale = 2)
    private BigDecimal amountPaid;

    private String notes;

    // ── getters / setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public RdFdInvestment getInvestment() { return investment; }
    public void setInvestment(RdFdInvestment v) { investment = v; }
    public Integer getMonthNumber() { return monthNumber; }
    public void setMonthNumber(Integer v) { monthNumber = v; }
    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate v) { paymentDate = v; }
    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal v) { amountPaid = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { notes = v; }
}
