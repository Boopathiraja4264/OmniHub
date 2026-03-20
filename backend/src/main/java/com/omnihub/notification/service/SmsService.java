package com.omnihub.notification.service;

import com.omnihub.core.entity.User;
import com.omnihub.finance.entity.Transaction.TransactionType;
import com.omnihub.finance.repository.BudgetRepository;
import com.omnihub.finance.repository.TransactionRepository;
import com.omnihub.fitness.repository.WeeklyPlanRepository;
import com.omnihub.fitness.repository.WeightLogRepository;
import com.omnihub.fitness.repository.WorkoutLogRepository;
import com.omnihub.core.util.LogMaskUtil;
import com.omnihub.notification.entity.SmsSettings;
import com.omnihub.notification.repository.SmsSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    @Value("${fast2sms.api-key:}")
    private String fast2SmsApiKey;

    @Autowired private SmsSettingsRepository smsSettingsRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private BudgetRepository budgetRepository;
    @Autowired private WorkoutLogRepository workoutLogRepository;
    @Autowired private WeightLogRepository weightLogRepository;
    @Autowired private WeeklyPlanRepository weeklyPlanRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void sendScheduledSms() {
        LocalTime now = LocalTime.now(ZoneId.of("Asia/Kolkata"));
        List<SmsSettings> list = smsSettingsRepository.findAllEnabledAtTime(now.getHour(), now.getMinute());
        for (SmsSettings settings : list) {
            try {
                sendSms(settings);
            } catch (Exception e) {
                log.error("SMS failed for user {}: {}", LogMaskUtil.maskEmail(settings.getUser().getEmail()), e.getMessage());
            }
        }
    }

    public void sendSms(SmsSettings settings) {
        String message = buildMessage(settings.getUser(), settings);
        sendViaTFast2Sms(settings.getPhoneNumber(), message);
    }

    private String buildMessage(User user, SmsSettings settings) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        int month = today.getMonthValue();
        int year = today.getYear();
        String dateStr = today.getDayOfMonth() + "-" +
                today.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);

        StringBuilder sb = new StringBuilder();
        sb.append("OmniHub ").append(dateStr).append("\n");

        if (settings.isIncludeWeight()) {
            weightLogRepository.findTopByUserIdOrderByDateDesc(user.getId()).ifPresent(w -> {
                sb.append("Wt: ").append(w.getWeight()).append("kg\n");
            });
        }

        if (settings.isIncludeWorkout()) {
            LocalDate weekStart = today.minusDays(today.getDayOfWeek().getValue() - 1);
            long weekCount = workoutLogRepository.countByUserIdAndDateBetween(user.getId(), weekStart, today);
            sb.append("Workouts: ").append(weekCount).append(" this wk\n");
        }

        if (settings.isIncludeTransactions()) {
            BigDecimal expenses = transactionRepository.sumByUserIdAndTypeAndMonthAndYear(
                    user.getId(), TransactionType.EXPENSE, month, year);
            if (expenses == null) expenses = BigDecimal.ZERO;
            sb.append("Spent: Rs.").append(expenses.toBigInteger()).append("\n");
        }

        if (settings.isIncludeBudget()) {
            var budgets = budgetRepository.findByUserIdAndMonthNumberAndYear(user.getId(), month, year);
            if (!budgets.isEmpty()) {
                Map<String, BigDecimal> spentByCategory = new HashMap<>();
                for (Object[] row : transactionRepository.sumExpensesByCategoryForMonth(user.getId(), month, year)) {
                    spentByCategory.put((String) row[0], (BigDecimal) row[1]);
                }
                for (var budget : budgets) {
                    BigDecimal spent = spentByCategory.getOrDefault(budget.getCategory(), BigDecimal.ZERO);
                    if (budget.getLimitAmount().compareTo(BigDecimal.ZERO) > 0) {
                        double pct = spent.divide(budget.getLimitAmount(), 2, java.math.RoundingMode.HALF_UP)
                                .doubleValue() * 100;
                        if (pct >= 80) {
                            sb.append(budget.getCategory()).append(": ")
                              .append(String.format("%.0f", pct)).append("%!\n");
                        }
                    }
                }
            }
        }

        if (settings.isIncludeWeeklyPlan()) {
            String day = today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase();
            weeklyPlanRepository.findByUserIdAndDayOfWeek(user.getId(), day).ifPresent(plan -> {
                String desc = plan.getPlanDescription();
                if (desc != null && desc.length() > 30) desc = desc.substring(0, 30);
                sb.append("Today: ").append(desc).append("\n");
            });
        }

        // Trim to 160 chars (standard SMS limit)
        String msg = sb.toString().trim();
        return msg.length() > 160 ? msg.substring(0, 157) + "..." : msg;
    }

    private void sendViaTFast2Sms(String phoneNumber, String message) {
        if (fast2SmsApiKey == null || fast2SmsApiKey.isBlank()) {
            throw new RuntimeException("FAST2SMS_API_KEY is not configured");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("authorization", fast2SmsApiKey);
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("message", message);
        params.add("language", "english");
        params.add("route", "q");
        params.add("numbers", phoneNumber);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(
                "https://www.fast2sms.com/dev/bulkV2", request, String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Fast2SMS error: " + response.getBody());
        }
        log.info("SMS sent to {}", LogMaskUtil.maskPhone(phoneNumber));
    }
}
