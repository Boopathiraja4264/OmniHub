package com.omnihub.finance.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "chit_batches", indexes = {
    @Index(name = "idx_chit_batch_group", columnList = "chit_group_id")
})
public class ChitBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chit_group_id", nullable = false)
    private ChitGroup chitGroup;

    @Column(nullable = false)
    private Integer batchNumber; // 1 or 2

    private LocalDate dateTaken; // date user won the auction and took the chit amount

    @Column(precision = 12, scale = 2)
    private BigDecimal amountTaken; // amount received when won

    @OneToMany(mappedBy = "chitBatch", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("monthNumber ASC")
    private List<ChitMonthlyEntry> monthlyEntries = new ArrayList<>();

    public Long getId() { return id; }
    public ChitGroup getChitGroup() { return chitGroup; }
    public void setChitGroup(ChitGroup v) { chitGroup = v; }
    public Integer getBatchNumber() { return batchNumber; }
    public void setBatchNumber(Integer v) { batchNumber = v; }
    public LocalDate getDateTaken() { return dateTaken; }
    public void setDateTaken(LocalDate v) { dateTaken = v; }
    public BigDecimal getAmountTaken() { return amountTaken; }
    public void setAmountTaken(BigDecimal v) { amountTaken = v; }
    public List<ChitMonthlyEntry> getMonthlyEntries() { return monthlyEntries; }
    public void setMonthlyEntries(List<ChitMonthlyEntry> v) { monthlyEntries = v; }
}
