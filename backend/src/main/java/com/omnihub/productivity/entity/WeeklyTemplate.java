package com.omnihub.productivity.entity;

import com.omnihub.core.entity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "productivity_weekly_templates")
public class WeeklyTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private boolean active = true;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("dayOfWeek ASC, startTime ASC")
    private List<TemplateBlock> blocks = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public WeeklyTemplate() {}

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User v) { user = v; }
    public String getName() { return name; }
    public void setName(String v) { name = v; }
    public boolean isActive() { return active; }
    public void setActive(boolean v) { active = v; }
    public List<TemplateBlock> getBlocks() { return blocks; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
