package com.omnihub.notification.entity;

import com.omnihub.core.entity.User;
import com.omnihub.core.security.EncryptedStringConverter;
import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "sms_settings")
public class SmsSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private boolean enabled = false;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 500)
    private String phoneNumber;

    private LocalTime sendTime1 = LocalTime.of(8, 0);
    private LocalTime sendTime2; // optional second send time

    private boolean includeWeight = true;
    private boolean includeWorkout = true;
    private boolean includeTransactions = true;
    private boolean includeBudget = true;
    private boolean includeWeeklyPlan = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public LocalTime getSendTime1() { return sendTime1; }
    public void setSendTime1(LocalTime sendTime1) { this.sendTime1 = sendTime1; }
    public LocalTime getSendTime2() { return sendTime2; }
    public void setSendTime2(LocalTime sendTime2) { this.sendTime2 = sendTime2; }
    public boolean isIncludeWeight() { return includeWeight; }
    public void setIncludeWeight(boolean v) { this.includeWeight = v; }
    public boolean isIncludeWorkout() { return includeWorkout; }
    public void setIncludeWorkout(boolean v) { this.includeWorkout = v; }
    public boolean isIncludeTransactions() { return includeTransactions; }
    public void setIncludeTransactions(boolean v) { this.includeTransactions = v; }
    public boolean isIncludeBudget() { return includeBudget; }
    public void setIncludeBudget(boolean v) { this.includeBudget = v; }
    public boolean isIncludeWeeklyPlan() { return includeWeeklyPlan; }
    public void setIncludeWeeklyPlan(boolean v) { this.includeWeeklyPlan = v; }
}
