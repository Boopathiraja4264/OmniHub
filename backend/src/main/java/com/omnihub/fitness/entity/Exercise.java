package com.omnihub.fitness.entity;
import jakarta.persistence.*;
import com.omnihub.core.entity.User;
@Entity
@Table(name = "exercises")
public class Exercise {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private String name;
    private String muscleGroup;
    private String description;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    public Exercise() {}
    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String v) { name = v; }
    public String getMuscleGroup() { return muscleGroup; }
    public void setMuscleGroup(String v) { muscleGroup = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { description = v; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
}
