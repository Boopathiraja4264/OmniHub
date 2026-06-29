package com.omnihub.finance.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "chit_monthly_entries", indexes = {
    @Index(name = "idx_chit_entry_batch", columnList = "chit_batch_id")
})
public class ChitMonthlyEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chit_batch_id", nullable = false)
    private ChitBatch chitBatch;

    @Column(nullable = false)
    private Integer monthNumber; // 1 to N (N = membersCount)

    @Column(nullable = false)
    private LocalDate monthDate; // calendar month date (EDATE from startDate)

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amountPerMonth; // fixed monthly chit amount

    @Column(precision = 12, scale = 2)
    private BigDecimal kasirPerMonth; // user-entered bid amount (nullable until entered)

    // Computed: (totalAmount - (monthNo-1)*monthly) * interest
    @Column(precision = 12, scale = 2)
    private BigDecimal companyYelam;

    // Computed: kasir * membersCount + totalAmount * commission (only when kasir is set)
    @Column(precision = 12, scale = 2)
    private BigDecimal thalliEduthathu;

    // ─── Payment tracking ─────────────────────────────────────────────────────
    // columnDefinition gives existing rows a default when Hibernate ALTERs the table
    @Column(nullable = false, columnDefinition = "boolean not null default false")
    private boolean paid = false;

    private LocalDate paidDate;            // date the monthly amount was paid

    private Long paidBankAccountId;        // bank account the payment came from

    private Long paidTransactionId;        // linked transaction, so edits/removal can sync it

    public Long getId() { return id; }
    public ChitBatch getChitBatch() { return chitBatch; }
    public void setChitBatch(ChitBatch v) { chitBatch = v; }
    public Integer getMonthNumber() { return monthNumber; }
    public void setMonthNumber(Integer v) { monthNumber = v; }
    public LocalDate getMonthDate() { return monthDate; }
    public void setMonthDate(LocalDate v) { monthDate = v; }
    public BigDecimal getAmountPerMonth() { return amountPerMonth; }
    public void setAmountPerMonth(BigDecimal v) { amountPerMonth = v; }
    public BigDecimal getKasirPerMonth() { return kasirPerMonth; }
    public void setKasirPerMonth(BigDecimal v) { kasirPerMonth = v; }
    public BigDecimal getCompanyYelam() { return companyYelam; }
    public void setCompanyYelam(BigDecimal v) { companyYelam = v; }
    public BigDecimal getThalliEduthathu() { return thalliEduthathu; }
    public void setThalliEduthathu(BigDecimal v) { thalliEduthathu = v; }
    public boolean isPaid() { return paid; }
    public void setPaid(boolean v) { paid = v; }
    public LocalDate getPaidDate() { return paidDate; }
    public void setPaidDate(LocalDate v) { paidDate = v; }
    public Long getPaidBankAccountId() { return paidBankAccountId; }
    public void setPaidBankAccountId(Long v) { paidBankAccountId = v; }
    public Long getPaidTransactionId() { return paidTransactionId; }
    public void setPaidTransactionId(Long v) { paidTransactionId = v; }
}
