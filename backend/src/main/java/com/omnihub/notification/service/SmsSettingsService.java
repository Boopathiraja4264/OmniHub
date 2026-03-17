package com.omnihub.notification.service;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.notification.entity.SmsSettings;
import com.omnihub.notification.repository.SmsSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalTime;

@Service
public class SmsSettingsService {

    @Autowired private SmsSettingsRepository smsSettingsRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private SmsService smsService;

    public SmsSettings getOrCreate(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return smsSettingsRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    SmsSettings s = new SmsSettings();
                    s.setUser(user);
                    return smsSettingsRepository.save(s);
                });
    }

    public SmsSettings update(String email, SmsSettingsRequest req) {
        SmsSettings settings = getOrCreate(email);
        settings.setEnabled(req.isEnabled());
        settings.setPhoneNumber(req.getPhoneNumber());
        settings.setSendTime1(LocalTime.parse(req.getSendTime1()));
        settings.setSendTime2(req.getSendTime2() != null && !req.getSendTime2().isBlank()
                ? LocalTime.parse(req.getSendTime2()) : null);
        settings.setIncludeWeight(req.isIncludeWeight());
        settings.setIncludeWorkout(req.isIncludeWorkout());
        settings.setIncludeTransactions(req.isIncludeTransactions());
        settings.setIncludeBudget(req.isIncludeBudget());
        settings.setIncludeWeeklyPlan(req.isIncludeWeeklyPlan());
        return smsSettingsRepository.save(settings);
    }

    public void sendTest(String email) {
        SmsSettings settings = getOrCreate(email);
        if (settings.getPhoneNumber() == null || settings.getPhoneNumber().isBlank()) {
            throw new RuntimeException("No phone number configured");
        }
        smsService.sendSms(settings);
    }

    public static class SmsSettingsRequest {
        private boolean enabled;
        private String phoneNumber;
        private String sendTime1 = "08:00";
        private String sendTime2;
        private boolean includeWeight = true;
        private boolean includeWorkout = true;
        private boolean includeTransactions = true;
        private boolean includeBudget = true;
        private boolean includeWeeklyPlan = true;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean v) { this.enabled = v; }
        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String v) { this.phoneNumber = v; }
        public String getSendTime1() { return sendTime1; }
        public void setSendTime1(String v) { this.sendTime1 = v; }
        public String getSendTime2() { return sendTime2; }
        public void setSendTime2(String v) { this.sendTime2 = v; }
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
}
