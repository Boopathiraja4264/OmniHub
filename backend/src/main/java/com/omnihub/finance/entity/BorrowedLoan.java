package com.omnihub.finance.entity;

import com.omnihub.core.entity.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "borrowed_loans", indexes = {
    @Index(name = "idx_borrowed_loan_user", columnList = "user_id")
})
public class BorrowedLoan {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String loanId;          // BR001, BR002

    @Column(nullable = false)
    private String lenderName;      // "Kandasamy M"

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amountBorrowed;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amountRepaid;

    @Column(nullable = false)
    private LocalDate dateBorrowed;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private BorrowStatus status;    // OUTSTANDING, REPAID

    @Column
    private String notes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "borrowedLoan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("paymentDate ASC")
    private List<BorrowedRepayment> repayments = new ArrayList<>();

    public enum BorrowStatus { OUTSTANDING, REPAID }

    // derived
    public BigDecimal getOutstandingBalance() {
        return amountBorrowed.subtract(amountRepaid);
    }

    // ── Getters / Setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public String getLoanId() { return loanId; }
    public void setLoanId(String v) { loanId = v; }
    public String getLenderName() { return lenderName; }
    public void setLenderName(String v) { lenderName = v; }
    public BigDecimal getAmountBorrowed() { return amountBorrowed; }
    public void setAmountBorrowed(BigDecimal v) { amountBorrowed = v; }
    public BigDecimal getAmountRepaid() { return amountRepaid; }
    public void setAmountRepaid(BigDecimal v) { amountRepaid = v; }
    public LocalDate getDateBorrowed() { return dateBorrowed; }
    public void setDateBorrowed(LocalDate v) { dateBorrowed = v; }
    public BorrowStatus getStatus() { return status; }
    public void setStatus(BorrowStatus v) { status = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { notes = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<BorrowedRepayment> getRepayments() { return repayments; }
    public void setRepayments(List<BorrowedRepayment> v) { repayments = v; }
}
