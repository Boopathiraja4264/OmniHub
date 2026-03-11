package com.omnihub.fitness.entity;
import jakarta.persistence.*;
@Entity
@Table(name = "exercise_sets")
public class ExerciseSet {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Integer sets;
    private Integer reps;
    private Double weight;
    private String notes;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "exercise_id")
    private Exercise exercise;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "workout_log_id")
    private WorkoutLog workoutLog;
    public ExerciseSet() {}
    public Long getId() { return id; }
    public Integer getSets() { return sets; }
    public void setSets(Integer v) { sets = v; }
    public Integer getReps() { return reps; }
    public void setReps(Integer v) { reps = v; }
    public Double getWeight() { return weight; }
    public void setWeight(Double v) { weight = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { notes = v; }
    public Exercise getExercise() { return exercise; }
    public void setExercise(Exercise v) { exercise = v; }
    public WorkoutLog getWorkoutLog() { return workoutLog; }
    public void setWorkoutLog(WorkoutLog v) { workoutLog = v; }
}
