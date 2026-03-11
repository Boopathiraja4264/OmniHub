package com.omnihub.fitness.entity;
import jakarta.persistence.*;
import com.omnihub.core.entity.User;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
@Entity
@Table(name = "workout_logs")
public class WorkoutLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private LocalDate date;
    private String notes;
    @OneToMany(mappedBy = "workoutLog", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<ExerciseSet> sets = new ArrayList<>();
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    public WorkoutLog() {}
    public Long getId() { return id; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate v) { date = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { notes = v; }
    public List<ExerciseSet> getSets() { return sets; }
    public void setSets(List<ExerciseSet> v) { sets = v; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
}
