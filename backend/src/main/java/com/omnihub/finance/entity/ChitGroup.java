package com.omnihub.finance.entity;

import jakarta.persistence.*;
import com.omnihub.core.entity.User;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "chit_groups", indexes = {
    @Index(name = "idx_chit_group_user", columnList = "user_id")
})
public class ChitGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // e.g. "DEC 2025 10000"

    @Column(nullable = false)
    private String groupLabel; // A, B, C, D...

    @Column(nullable = false)
    private Integer membersCount; // total members in the group

    @Column(nullable = false)
    private Integer totalBatches; // how many chit slots the user holds (1 or 2)

    @Column(nullable = false)
    private Integer membersPerBatch;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal monthlyAmount; // amount per chit per month

    @Column(precision = 5, scale = 4)
    private BigDecimal basicInterest; // e.g. 0.1200 = 12%

    @Column(precision = 5, scale = 4)
    private BigDecimal companyCommission; // e.g. 0.0100 = 1%

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ChitStatus status;

    private String notes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "chitGroup", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("batchNumber ASC")
    private List<ChitBatch> batches = new ArrayList<>();

    public enum ChitStatus {
        ACTIVE, COMPLETED
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String v) { name = v; }
    public String getGroupLabel() { return groupLabel; }
    public void setGroupLabel(String v) { groupLabel = v; }
    public Integer getMembersCount() { return membersCount; }
    public void setMembersCount(Integer v) { membersCount = v; }
    public Integer getTotalBatches() { return totalBatches; }
    public void setTotalBatches(Integer v) { totalBatches = v; }
    public Integer getMembersPerBatch() { return membersPerBatch; }
    public void setMembersPerBatch(Integer v) { membersPerBatch = v; }
    public BigDecimal getMonthlyAmount() { return monthlyAmount; }
    public void setMonthlyAmount(BigDecimal v) { monthlyAmount = v; }
    public BigDecimal getBasicInterest() { return basicInterest; }
    public void setBasicInterest(BigDecimal v) { basicInterest = v; }
    public BigDecimal getCompanyCommission() { return companyCommission; }
    public void setCompanyCommission(BigDecimal v) { companyCommission = v; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate v) { startDate = v; }
    public ChitStatus getStatus() { return status; }
    public void setStatus(ChitStatus v) { status = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { notes = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public List<ChitBatch> getBatches() { return batches; }
    public void setBatches(List<ChitBatch> v) { batches = v; }
}
