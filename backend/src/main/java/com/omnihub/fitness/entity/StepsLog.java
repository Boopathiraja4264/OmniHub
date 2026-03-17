package com.omnihub.fitness.entity;

import com.omnihub.core.entity.User;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "steps_logs", indexes = {
    @Index(name = "idx_stepslog_user_date", columnList = "user_id, date DESC")
})
public class StepsLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDate date;

    private Integer steps;
    private Double runKm;
    private String stepsTime;  // e.g. "45 min"
    private String runTime;    // e.g. "30 min"
    private String notes;

    public StepsLog() {}

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public Integer getSteps() { return steps; }
    public void setSteps(Integer steps) { this.steps = steps; }
    public Double getRunKm() { return runKm; }
    public void setRunKm(Double runKm) { this.runKm = runKm; }
    public String getStepsTime() { return stepsTime; }
    public void setStepsTime(String stepsTime) { this.stepsTime = stepsTime; }
    public String getRunTime() { return runTime; }
    public void setRunTime(String runTime) { this.runTime = runTime; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
