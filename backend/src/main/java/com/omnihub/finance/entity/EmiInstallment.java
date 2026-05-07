package com.omnihub.finance.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "emi_installments", indexes = {
    @Index(name = "idx_emi_installment_loan", columnList = "emi_loan_id")
})
public class EmiInstallment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "emi_loan_id", nullable = false)
    private EmiLoan emiLoan;

    @Column(nullable = false)
    private Integer installmentNumber;

    @Column(nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal openingPrincipal;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal emiAmount;       // principal + interest + gst

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal principalPart;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal interestPart;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal gstPart;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal closingPrincipal;

    @Column(nullable = false)
    private boolean paid = false;

    // ── Getters / Setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public EmiLoan getEmiLoan() { return emiLoan; }
    public void setEmiLoan(EmiLoan v) { emiLoan = v; }
    public Integer getInstallmentNumber() { return installmentNumber; }
    public void setInstallmentNumber(Integer v) { installmentNumber = v; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate v) { dueDate = v; }
    public BigDecimal getOpeningPrincipal() { return openingPrincipal; }
    public void setOpeningPrincipal(BigDecimal v) { openingPrincipal = v; }
    public BigDecimal getEmiAmount() { return emiAmount; }
    public void setEmiAmount(BigDecimal v) { emiAmount = v; }
    public BigDecimal getPrincipalPart() { return principalPart; }
    public void setPrincipalPart(BigDecimal v) { principalPart = v; }
    public BigDecimal getInterestPart() { return interestPart; }
    public void setInterestPart(BigDecimal v) { interestPart = v; }
    public BigDecimal getGstPart() { return gstPart; }
    public void setGstPart(BigDecimal v) { gstPart = v; }
    public BigDecimal getClosingPrincipal() { return closingPrincipal; }
    public void setClosingPrincipal(BigDecimal v) { closingPrincipal = v; }
    public boolean isPaid() { return paid; }
    public void setPaid(boolean v) { paid = v; }
}
