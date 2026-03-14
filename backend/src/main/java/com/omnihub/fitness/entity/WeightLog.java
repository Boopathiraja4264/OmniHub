package com.omnihub.fitness.entity;

import jakarta.persistence.*;
import com.omnihub.core.entity.User;
import java.time.LocalDate;

@Entity
@Table(name = "weight_logs")
public class WeightLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private LocalDate date;
    @Column(nullable = false)
    private Double weight;
    private String notes;
    @Column
    private Double weeklyTarget; // auto-calculated target for this week
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public WeightLog() {
    }

    public Long getId() {
        return id;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate v) {
        date = v;
    }

    public Double getWeight() {
        return weight;
    }

    public void setWeight(Double v) {
        weight = v;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String v) {
        notes = v;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User v) {
        user = v;
    }

    public Double getWeeklyTarget() {
        return weeklyTarget;
    }

    public void setWeeklyTarget(Double v) {
        weeklyTarget = v;
    }
}
