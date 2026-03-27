package com.omnihub.productivity.entity;

import com.omnihub.core.entity.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "productivity_focus_scores",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "score_date"}))
public class FocusScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "score_date", nullable = false)
    private LocalDate scoreDate;

    @Column(precision = 5, scale = 2)
    private BigDecimal taskScore;

    @Column(precision = 5, scale = 2)
    private BigDecimal blockScore;

    @Column(precision = 5, scale = 2)
    private BigDecimal timeAccuracyScore;

    @Column(precision = 5, scale = 2)
    private BigDecimal streakBonus;

    @Column(precision = 5, scale = 2)
    private BigDecimal totalScore;

    @Column(nullable = false)
    private int streakDays = 0;

    @Column(nullable = false)
    private LocalDateTime computedAt;

    @PrePersist
    @PreUpdate
    protected void onSave() { computedAt = LocalDateTime.now(); }

    public FocusScore() {}

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public LocalDate getScoreDate() { return scoreDate; }
    public void setScoreDate(LocalDate v) { scoreDate = v; }
    public BigDecimal getTaskScore() { return taskScore; }
    public void setTaskScore(BigDecimal v) { taskScore = v; }
    public BigDecimal getBlockScore() { return blockScore; }
    public void setBlockScore(BigDecimal v) { blockScore = v; }
    public BigDecimal getTimeAccuracyScore() { return timeAccuracyScore; }
    public void setTimeAccuracyScore(BigDecimal v) { timeAccuracyScore = v; }
    public BigDecimal getStreakBonus() { return streakBonus; }
    public void setStreakBonus(BigDecimal v) { streakBonus = v; }
    public BigDecimal getTotalScore() { return totalScore; }
    public void setTotalScore(BigDecimal v) { totalScore = v; }
    public int getStreakDays() { return streakDays; }
    public void setStreakDays(int v) { streakDays = v; }
    public LocalDateTime getComputedAt() { return computedAt; }
}
