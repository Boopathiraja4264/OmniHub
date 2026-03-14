package com.omnihub.core.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;
    @Column(nullable = false)
    private String password;
    @Column(nullable = false)
    private String fullName;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column
    private Double heightCm;
    @Column
    private Double goalWeight;
    @Column
    private Double weeklyLossRate;
    @Column
    private Double startWeight;
    @Column
    private String scheduleStartDate;
    @Column
    private Double scheduleStartWeight;

    public User() {
    }

    public static UserBuilder builder() {
        return new UserBuilder();
    }

    public static class UserBuilder {
        private String email, password, fullName;
        private Double heightCm, goalWeight, weeklyLossRate, startWeight;

        public UserBuilder heightCm(Double v) {
            this.heightCm = v;
            return this;
        }

        public UserBuilder goalWeight(Double v) {
            this.goalWeight = v;
            return this;
        }

        public UserBuilder weeklyLossRate(Double v) {
            this.weeklyLossRate = v;
            return this;
        }

        public UserBuilder startWeight(Double v) {
            this.startWeight = v;
            return this;
        }

        public UserBuilder email(String v) {
            this.email = v;
            return this;
        }

        public UserBuilder password(String v) {
            this.password = v;
            return this;
        }

        public UserBuilder fullName(String v) {
            this.fullName = v;
            return this;
        }

        public User build() {
            User u = new User();
            u.heightCm = heightCm;
            u.goalWeight = goalWeight;
            u.weeklyLossRate = weeklyLossRate;
            u.startWeight = startWeight;
            u.email = email;
            u.password = password;
            u.fullName = fullName;
            return u;
        }
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String v) {
        email = v;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String v) {
        password = v;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String v) {
        fullName = v;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public Double getHeightCm() {
        return heightCm;
    }

    public void setHeightCm(Double v) {
        heightCm = v;
    }

    public Double getGoalWeight() {
        return goalWeight;
    }

    public void setGoalWeight(Double v) {
        goalWeight = v;
    }

    public Double getWeeklyLossRate() {
        return weeklyLossRate;
    }

    public void setWeeklyLossRate(Double v) {
        weeklyLossRate = v;
    }

    public Double getStartWeight() {
        return startWeight;
    }

    public void setStartWeight(Double v) {
        startWeight = v;
    }

    public String getScheduleStartDate() {
        return scheduleStartDate;
    }

    public void setScheduleStartDate(String v) {
        scheduleStartDate = v;
    }

    public Double getScheduleStartWeight() {
        return scheduleStartWeight;
    }

    public void setScheduleStartWeight(Double v) {
        scheduleStartWeight = v;
    }
}