package com.omnihub.productivity.entity;

import com.omnihub.core.entity.User;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "productivity_tasks", indexes = {
    @Index(name = "idx_ptask_user_status", columnList = "user_id, status"),
    @Index(name = "idx_ptask_user_due",    columnList = "user_id, due_date")
})
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.TODO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskPriority priority = TaskPriority.MEDIUM;

    private LocalDate dueDate;

    private Integer estimatedMinutes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskRecurring recurring = TaskRecurring.NONE;

    @Column(name = "parent_task_id")
    private Long parentTaskId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }

    public enum TaskCategory    { PERSONAL, PROFESSIONAL }
    public enum TaskStatus      { TODO, IN_PROGRESS, DONE, DEFERRED }
    public enum TaskPriority    { LOW, MEDIUM, HIGH, URGENT }
    public enum TaskRecurring   { NONE, DAILY, WEEKDAYS, WEEKLY }

    public Task() {}

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { title = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { description = v; }
    public TaskCategory getCategory() { return category; }
    public void setCategory(TaskCategory v) { category = v; }
    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus v) { status = v; }
    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority v) { priority = v; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate v) { dueDate = v; }
    public Integer getEstimatedMinutes() { return estimatedMinutes; }
    public void setEstimatedMinutes(Integer v) { estimatedMinutes = v; }
    public TaskRecurring getRecurring() { return recurring; }
    public void setRecurring(TaskRecurring v) { recurring = v; }
    public Long getParentTaskId() { return parentTaskId; }
    public void setParentTaskId(Long v) { parentTaskId = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime v) { completedAt = v; }
}
