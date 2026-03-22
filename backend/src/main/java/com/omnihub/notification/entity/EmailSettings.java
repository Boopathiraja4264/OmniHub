package com.omnihub.notification.entity;

import com.omnihub.core.entity.User;
import com.omnihub.core.security.EncryptedStringConverter;
import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "email_settings")
public class EmailSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private boolean enabled = false;
    private LocalTime sendTime = LocalTime.of(8, 0);
    private boolean includeFinance = true;
    private boolean includeFitness = true;
    private boolean includeBudgetAlerts = true;
    private boolean includeWeeklyPlan = true;
    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 500)
    private String customEmail;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public LocalTime getSendTime() { return sendTime; }
    public void setSendTime(LocalTime sendTime) { this.sendTime = sendTime; }
    public boolean isIncludeFinance() { return includeFinance; }
    public void setIncludeFinance(boolean v) { this.includeFinance = v; }
    public boolean isIncludeFitness() { return includeFitness; }
    public void setIncludeFitness(boolean v) { this.includeFitness = v; }
    public boolean isIncludeBudgetAlerts() { return includeBudgetAlerts; }
    public void setIncludeBudgetAlerts(boolean v) { this.includeBudgetAlerts = v; }
    public boolean isIncludeWeeklyPlan() { return includeWeeklyPlan; }
    public void setIncludeWeeklyPlan(boolean v) { this.includeWeeklyPlan = v; }
    public String getCustomEmail() { return customEmail; }
    public void setCustomEmail(String v) { this.customEmail = v; }
}
