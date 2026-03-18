package com.omnihub.finance.entity;

import jakarta.persistence.*;
import com.omnihub.core.entity.User;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "vehicle_logs", indexes = {
    @Index(name = "idx_vlog_vehicle", columnList = "vehicle_id"),
    @Index(name = "idx_vlog_user", columnList = "user_id")
})
public class VehicleLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long expenseId;

    @Column(nullable = false)
    private Long vehicleId;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private Integer kmAtService;

    private String serviceType;

    @Column(precision = 12, scale = 2)
    private BigDecimal cost;

    private Integer nextServiceKm;

    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public VehicleLog() {}

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public Long getExpenseId() { return expenseId; }
    public void setExpenseId(Long v) { expenseId = v; }
    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long v) { vehicleId = v; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate v) { date = v; }
    public Integer getKmAtService() { return kmAtService; }
    public void setKmAtService(Integer v) { kmAtService = v; }
    public String getServiceType() { return serviceType; }
    public void setServiceType(String v) { serviceType = v; }
    public BigDecimal getCost() { return cost; }
    public void setCost(BigDecimal v) { cost = v; }
    public Integer getNextServiceKm() { return nextServiceKm; }
    public void setNextServiceKm(Integer v) { nextServiceKm = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { notes = v; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
