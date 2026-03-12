package com.omnihub.notification.service;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.notification.entity.EmailSettings;
import com.omnihub.notification.repository.EmailSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalTime;

@Service
public class EmailSettingsService {

    @Autowired private EmailSettingsRepository emailSettingsRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EmailService emailService;

    public EmailSettings getOrCreate(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return emailSettingsRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    EmailSettings s = new EmailSettings();
                    s.setUser(user);
                    return emailSettingsRepository.save(s);
                });
    }

    public EmailSettings update(String email, EmailSettingsRequest req) {
        EmailSettings settings = getOrCreate(email);
        settings.setEnabled(req.isEnabled());
        settings.setSendTime(LocalTime.parse(req.getSendTime()));
        settings.setIncludeFinance(req.isIncludeFinance());
        settings.setIncludeFitness(req.isIncludeFitness());
        settings.setIncludeBudgetAlerts(req.isIncludeBudgetAlerts());
        settings.setIncludeWeeklyPlan(req.isIncludeWeeklyPlan());
        if (req.getCustomEmail() != null && !req.getCustomEmail().isEmpty()) {
            settings.setCustomEmail(req.getCustomEmail());
        }
        return emailSettingsRepository.save(settings);
    }

    public void sendTest(String email) throws Exception {
        EmailSettings settings = getOrCreate(email);
        emailService.sendDailyEmail(settings);
    }

    public static class EmailSettingsRequest {
        private boolean enabled;
        private String sendTime;
        private boolean includeFinance = true;
        private boolean includeFitness = true;
        private boolean includeBudgetAlerts = true;
        private boolean includeWeeklyPlan = true;
        private String customEmail;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean v) { this.enabled = v; }
        public String getSendTime() { return sendTime; }
        public void setSendTime(String v) { this.sendTime = v; }
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
}
