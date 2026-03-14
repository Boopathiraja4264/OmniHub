package com.omnihub.fitness.entity;

import jakarta.persistence.*;
import com.omnihub.core.entity.User;

@Entity
@Table(name = "weight_goal_weeks")
public class WeightGoalWeek {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer weekNumber;

    @Column(nullable = false)
    private Boolean achieved = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public WeightGoalWeek() {}

    public Long getId() { return id; }

    public Integer getWeekNumber() { return weekNumber; }
    public void setWeekNumber(Integer v) { weekNumber = v; }

    public Boolean getAchieved() { return achieved; }
    public void setAchieved(Boolean v) { achieved = v; }

    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
}
