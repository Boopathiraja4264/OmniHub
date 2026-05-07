package com.omnihub.finance.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "borrowed_repayments", indexes = {
    @Index(name = "idx_borrowed_repayment_loan", columnList = "borrowed_loan_id")
})
public class BorrowedRepayment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "borrowed_loan_id", nullable = false)
    private BorrowedLoan borrowedLoan;

    @Column(nullable = false)
    private LocalDate paymentDate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column
    private String note;

    // ── Getters / Setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public BorrowedLoan getBorrowedLoan() { return borrowedLoan; }
    public void setBorrowedLoan(BorrowedLoan v) { borrowedLoan = v; }
    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate v) { paymentDate = v; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal v) { amount = v; }
    public String getNote() { return note; }
    public void setNote(String v) { note = v; }
}
