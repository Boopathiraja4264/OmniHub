package com.omnihub.fitness.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "weekly_plan_exercises")
public class WeeklyPlanExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "weekly_plan_id", nullable = false)
    private WeeklyPlan weeklyPlan;

    @Column(nullable = false)
    private String exerciseName;

    private String muscleGroup;
    private Integer plannedSets;
    private String plannedReps;
    private Integer sortOrder = 0;

    public WeeklyPlanExercise() {}

    public Long getId() { return id; }
    public WeeklyPlan getWeeklyPlan() { return weeklyPlan; }
    public void setWeeklyPlan(WeeklyPlan v) { this.weeklyPlan = v; }
    public String getExerciseName() { return exerciseName; }
    public void setExerciseName(String v) { this.exerciseName = v; }
    public String getMuscleGroup() { return muscleGroup; }
    public void setMuscleGroup(String v) { this.muscleGroup = v; }
    public Integer getPlannedSets() { return plannedSets; }
    public void setPlannedSets(Integer v) { this.plannedSets = v; }
    public String getPlannedReps() { return plannedReps; }
    public void setPlannedReps(String v) { this.plannedReps = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
}
