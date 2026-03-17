package com.omnihub.fitness.entity;

import com.omnihub.core.entity.User;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "steps_targets")
public class StepsTarget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDate setDate;

    private Integer targetSteps;
    private Double targetRunKm;

    public StepsTarget() {}

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public LocalDate getSetDate() { return setDate; }
    public void setSetDate(LocalDate setDate) { this.setDate = setDate; }
    public Integer getTargetSteps() { return targetSteps; }
    public void setTargetSteps(Integer targetSteps) { this.targetSteps = targetSteps; }
    public Double getTargetRunKm() { return targetRunKm; }
    public void setTargetRunKm(Double targetRunKm) { this.targetRunKm = targetRunKm; }
}
