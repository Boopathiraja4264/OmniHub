package com.omnihub.fitness.entity;
import jakarta.persistence.*;
import com.omnihub.core.entity.User;
import java.util.ArrayList;
import java.util.List;
@Entity
@Table(name = "weekly_plans")
public class WeeklyPlan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private String dayOfWeek;
    private String planDescription;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @OneToMany(mappedBy = "weeklyPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<WeeklyPlanExercise> exercises = new ArrayList<>();
    public WeeklyPlan() {}
    public Long getId() { return id; }
    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String v) { dayOfWeek = v; }
    public String getPlanDescription() { return planDescription; }
    public void setPlanDescription(String v) { planDescription = v; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public List<WeeklyPlanExercise> getExercises() { return exercises; }
    public void setExercises(List<WeeklyPlanExercise> v) { this.exercises = v; }
}
