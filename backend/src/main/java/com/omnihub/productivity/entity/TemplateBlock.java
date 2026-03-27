package com.omnihub.productivity.entity;

import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "productivity_template_blocks")
public class TemplateBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private WeeklyTemplate template;

    @Column(nullable = false)
    private String dayOfWeek; // MON | TUE | WED | THU | FRI | SAT | SUN

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TimeBlock.BlockCategory category;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    private String color;

    @Column(nullable = false)
    private int sortOrder = 0;

    public TemplateBlock() {}

    public Long getId() { return id; }
    public WeeklyTemplate getTemplate() { return template; }
    public void setTemplate(WeeklyTemplate v) { template = v; }
    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String v) { dayOfWeek = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { title = v; }
    public TimeBlock.BlockCategory getCategory() { return category; }
    public void setCategory(TimeBlock.BlockCategory v) { category = v; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime v) { startTime = v; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime v) { endTime = v; }
    public String getColor() { return color; }
    public void setColor(String v) { color = v; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int v) { sortOrder = v; }
}
