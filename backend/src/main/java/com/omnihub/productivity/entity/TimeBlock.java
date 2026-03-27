package com.omnihub.productivity.entity;

import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "productivity_time_blocks")
public class TimeBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private DailyPlan dailyPlan;

    @Column(name = "task_id")
    private Long taskId;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BlockCategory category;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    private String color;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BlockStatus status = BlockStatus.PLANNED;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private int sortOrder = 0;

    public enum BlockCategory { PERSONAL, PROFESSIONAL, DEEP_WORK, BREAK, ADMIN }
    public enum BlockStatus   { PLANNED, IN_PROGRESS, DONE, SKIPPED }

    public TimeBlock() {}

    public Long getId() { return id; }
    public DailyPlan getDailyPlan() { return dailyPlan; }
    public void setDailyPlan(DailyPlan v) { dailyPlan = v; }
    public Long getTaskId() { return taskId; }
    public void setTaskId(Long v) { taskId = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { title = v; }
    public BlockCategory getCategory() { return category; }
    public void setCategory(BlockCategory v) { category = v; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime v) { startTime = v; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime v) { endTime = v; }
    public String getColor() { return color; }
    public void setColor(String v) { color = v; }
    public BlockStatus getStatus() { return status; }
    public void setStatus(BlockStatus v) { status = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { notes = v; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int v) { sortOrder = v; }
}
