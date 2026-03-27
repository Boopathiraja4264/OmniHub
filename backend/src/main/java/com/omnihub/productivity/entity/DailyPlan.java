package com.omnihub.productivity.entity;

import com.omnihub.core.entity.User;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "productivity_daily_plans",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "plan_date"}))
public class DailyPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlanStatus status = PlanStatus.DRAFT;

    @OneToMany(mappedBy = "dailyPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("startTime ASC")
    private List<TimeBlock> timeBlocks = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public enum PlanStatus { DRAFT, ACTIVE, COMPLETED }

    public DailyPlan() {}

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public LocalDate getPlanDate() { return planDate; }
    public void setPlanDate(LocalDate v) { planDate = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { notes = v; }
    public PlanStatus getStatus() { return status; }
    public void setStatus(PlanStatus v) { status = v; }
    public List<TimeBlock> getTimeBlocks() { return timeBlocks; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
