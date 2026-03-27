package com.omnihub.productivity.entity;

import com.omnihub.core.entity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "productivity_time_entries", indexes = {
    @Index(name = "idx_te_user_started", columnList = "user_id, started_at DESC"),
    @Index(name = "idx_te_active",       columnList = "user_id, ended_at")
})
public class TimeEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "task_id")
    private Long taskId;

    @Column(name = "block_id")
    private Long blockId;

    private String description;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    private LocalDateTime endedAt;   // null = currently running

    private Integer durationMinutes; // computed on stop

    @PrePersist
    protected void onCreate() {
        if (startedAt == null) startedAt = LocalDateTime.now();
    }

    public TimeEntry() {}

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public Long getTaskId() { return taskId; }
    public void setTaskId(Long v) { taskId = v; }
    public Long getBlockId() { return blockId; }
    public void setBlockId(Long v) { blockId = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { description = v; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime v) { startedAt = v; }
    public LocalDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(LocalDateTime v) { endedAt = v; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer v) { durationMinutes = v; }
}
