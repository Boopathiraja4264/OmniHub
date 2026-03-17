package com.omnihub.notification.service;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.notification.entity.SlackSettings;
import com.omnihub.notification.repository.SlackSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalTime;

@Service
public class SlackSettingsService {

    @Autowired private SlackSettingsRepository slackSettingsRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private SlackService slackService;

    public SlackSettings getOrCreate(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return slackSettingsRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    SlackSettings s = new SlackSettings();
                    s.setUser(user);
                    return slackSettingsRepository.save(s);
                });
    }

    public SlackSettings update(String email, SlackSettingsRequest req) {
        SlackSettings settings = getOrCreate(email);
        settings.setEnabled(req.isEnabled());
        settings.setWebhookUrl(req.getWebhookUrl());
        settings.setSendTime1(LocalTime.parse(req.getSendTime1()));
        settings.setSendTime2(req.getSendTime2() != null && !req.getSendTime2().isBlank()
                ? LocalTime.parse(req.getSendTime2()) : null);
        settings.setIncludeWeight(req.isIncludeWeight());
        settings.setIncludeWorkout(req.isIncludeWorkout());
        settings.setIncludeTransactions(req.isIncludeTransactions());
        settings.setIncludeBudget(req.isIncludeBudget());
        settings.setIncludeWeeklyPlan(req.isIncludeWeeklyPlan());
        if (req.getTemplate1() != null) settings.setTemplate1(req.getTemplate1());
        if (req.getTemplate2() != null) settings.setTemplate2(req.getTemplate2());
        return slackSettingsRepository.save(settings);
    }

    public void sendTest(String email) {
        SlackSettings settings = getOrCreate(email);
        if (settings.getWebhookUrl() == null || settings.getWebhookUrl().isBlank()) {
            throw new RuntimeException("No webhook URL configured");
        }
        slackService.sendSlack(settings);
    }

    public static class SlackSettingsRequest {
        private boolean enabled;
        private String webhookUrl;
        private String sendTime1 = "08:00";
        private String sendTime2;
        private boolean includeWeight = true;
        private boolean includeWorkout = true;
        private boolean includeTransactions = true;
        private boolean includeBudget = true;
        private boolean includeWeeklyPlan = true;
        private String template1 = "MORNING";
        private String template2 = "MORNING";

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean v) { this.enabled = v; }
        public String getWebhookUrl() { return webhookUrl; }
        public void setWebhookUrl(String v) { this.webhookUrl = v; }
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
        public String getTemplate1() { return template1; }
        public void setTemplate1(String v) { this.template1 = v; }
        public String getTemplate2() { return template2; }
        public void setTemplate2(String v) { this.template2 = v; }
    }
}
