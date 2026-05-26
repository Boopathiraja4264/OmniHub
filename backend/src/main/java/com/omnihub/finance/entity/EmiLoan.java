package com.omnihub.finance.entity;

import com.omnihub.core.entity.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "emi_loans", indexes = {
    @Index(name = "idx_emi_loan_user", columnList = "user_id")
})
public class EmiLoan {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String loanId;          // GA001, PL001 etc.

    @Column(nullable = false)
    private String name;            // "Macbook EMI"

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal initialPrincipal;

    @Column(nullable = false, precision = 8, scale = 6)
    private BigDecimal annualInterestRate; // 0.1599

    @Column(nullable = false)
    private Integer tenureMonths;   // 24

    @Column(precision = 6, scale = 4)
    private BigDecimal gstRate;     // 0.18

    @Column(nullable = false, precision = 12, scale = 4)
    private BigDecimal baseEmi;     // computed monthly EMI (principal + interest only)

    @Column(nullable = false)
    private LocalDate startDate;

    @Column
    private LocalDate endDate;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private EmiStatus status;

    @Column(precision = 14, scale = 2)
    private BigDecimal principalPaid;

    @Column(precision = 14, scale = 2)
    private BigDecimal interestPaid;

    @Column(precision = 14, scale = 2)
    private BigDecimal gstPaid;

    // Foreclosure fields
    @Column(nullable = false)
    private boolean foreclosed = false;

    @Column
    private LocalDate foreclosureDate;

    @Column(precision = 14, scale = 2)
    private BigDecimal foreclosureAmount;   // total paid at foreclosure

    @Column(precision = 14, scale = 2)
    private BigDecimal foreclosurePrincipal;

    @Column(precision = 14, scale = 2)
    private BigDecimal foreclosureInterest;

    @Column(precision = 14, scale = 2)
    private BigDecimal foreclosureCharges;  // 3% of outstanding principal

    @Column(precision = 14, scale = 2)
    private BigDecimal foreclosureChargesGst;  // 18% of foreclosure charges

    @Column(precision = 14, scale = 2)
    private BigDecimal foreclosureInterestGst;  // 18% of upcoming month interest

    @Column(precision = 14, scale = 2)
    private BigDecimal processingCharge;

    @Column(precision = 14, scale = 2)
    private BigDecimal processingChargePaid;

    @Column
    private String notes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "emiLoan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("installmentNumber ASC")
    private List<EmiInstallment> installments = new ArrayList<>();

    public enum EmiStatus { ACTIVE, CLOSED, FORECLOSED }

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
    public Integer getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(Integer v) { tenureMonths = v; }
    public BigDecimal getGstRate() { return gstRate; }
    public void setGstRate(BigDecimal v) { gstRate = v; }
    public BigDecimal getBaseEmi() { return baseEmi; }
    public void setBaseEmi(BigDecimal v) { baseEmi = v; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate v) { startDate = v; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate v) { endDate = v; }
    public EmiStatus getStatus() { return status; }
    public void setStatus(EmiStatus v) { status = v; }
    public BigDecimal getPrincipalPaid() { return principalPaid; }
    public void setPrincipalPaid(BigDecimal v) { principalPaid = v; }
    public BigDecimal getInterestPaid() { return interestPaid; }
    public void setInterestPaid(BigDecimal v) { interestPaid = v; }
    public BigDecimal getGstPaid() { return gstPaid; }
    public void setGstPaid(BigDecimal v) { gstPaid = v; }
    public boolean isForeclosed() { return foreclosed; }
    public void setForeclosed(boolean v) { foreclosed = v; }
    public LocalDate getForeclosureDate() { return foreclosureDate; }
    public void setForeclosureDate(LocalDate v) { foreclosureDate = v; }
    public BigDecimal getForeclosureAmount() { return foreclosureAmount; }
    public void setForeclosureAmount(BigDecimal v) { foreclosureAmount = v; }
    public BigDecimal getForeclosurePrincipal() { return foreclosurePrincipal; }
    public void setForeclosurePrincipal(BigDecimal v) { foreclosurePrincipal = v; }
    public BigDecimal getForeclosureInterest() { return foreclosureInterest; }
    public void setForeclosureInterest(BigDecimal v) { foreclosureInterest = v; }
    public BigDecimal getForeclosureCharges() { return foreclosureCharges; }
    public void setForeclosureCharges(BigDecimal v) { foreclosureCharges = v; }
    public BigDecimal getForeclosureChargesGst() { return foreclosureChargesGst; }
    public void setForeclosureChargesGst(BigDecimal v) { foreclosureChargesGst = v; }
    public BigDecimal getForeclosureInterestGst() { return foreclosureInterestGst; }
    public void setForeclosureInterestGst(BigDecimal v) { foreclosureInterestGst = v; }
    public BigDecimal getProcessingCharge() { return processingCharge; }
    public void setProcessingCharge(BigDecimal v) { processingCharge = v; }
    public BigDecimal getProcessingChargePaid() { return processingChargePaid; }
    public void setProcessingChargePaid(BigDecimal v) { processingChargePaid = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { notes = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<EmiInstallment> getInstallments() { return installments; }
    public void setInstallments(List<EmiInstallment> v) { installments = v; }
}
