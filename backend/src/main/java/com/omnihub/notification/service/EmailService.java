package com.omnihub.notification.service;

import com.omnihub.backup.service.OneDriveTokenService;
import com.omnihub.core.entity.User;
import com.omnihub.finance.entity.Transaction.TransactionType;
import com.omnihub.finance.repository.BudgetRepository;
import com.omnihub.finance.repository.TransactionRepository;
import com.omnihub.fitness.entity.WeeklyPlan;
import com.omnihub.fitness.repository.WeeklyPlanRepository;
import com.omnihub.fitness.repository.WeightLogRepository;
import com.omnihub.fitness.repository.WorkoutLogRepository;
import com.omnihub.notification.entity.EmailSettings;
import com.omnihub.notification.repository.EmailSettingsRepository;
// import jakarta.mail.internet.MimeMessage;
import com.omnihub.core.util.LogMaskUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
// import org.springframework.mail.javamail.JavaMailSender;
// import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.*;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    // @Autowired
    // private JavaMailSender mailSender;
    @Autowired
    private OneDriveTokenService tokenService;
    @Autowired
    private EmailSettingsRepository emailSettingsRepository;
    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private BudgetRepository budgetRepository;
    @Autowired
    private WorkoutLogRepository workoutLogRepository;
    @Autowired
    private WeightLogRepository weightLogRepository;
    @Autowired
    private WeeklyPlanRepository weeklyPlanRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String GRAPH_SENDMAIL_URL = "https://graph.microsoft.com/v1.0/me/sendMail";

    @Scheduled(cron = "0 * * * * *")
    public void sendScheduledEmails() {
        LocalTime now = LocalTime.now(ZoneId.of("Asia/Kolkata"));
        int hour = now.getHour();
        int minute = now.getMinute();
        
        List<EmailSettings> settings = emailSettingsRepository.findAllEnabledAtTime(hour, minute);
        if (!settings.isEmpty()) {
            log.info("Found {} enabled email schedules at {}:{}", settings.size(), hour, minute);
        }

        for (EmailSettings setting : settings) {
            try {
                log.info("Sending scheduled email to: {}", LogMaskUtil.maskEmail(setting.getUser().getEmail()));
                sendDailyEmail(setting);
            } catch (Exception e) {
                log.error("Failed to send email for: {} - {}", LogMaskUtil.maskEmail(setting.getUser().getEmail()), e.getMessage());
            }
        }
    }

    public void sendDailyEmail(EmailSettings settings) throws Exception {
        User user = settings.getUser();
        String toEmail = (settings.getCustomEmail() != null && !settings.getCustomEmail().isEmpty())
                ? settings.getCustomEmail()
                : user.getEmail();

        String html = buildEmailHtml(user, settings);
        String subject = "🌟 OmniHub Daily Summary - " + LocalDate.now();

        /*
         * // Gmail SMTP implementation (Commented out)
         * MimeMessage message = mailSender.createMimeMessage();
         * MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
         * helper.setTo(toEmail);
         * helper.setSubject(subject);
         * helper.setText(html, true);
         * mailSender.send(message);
         */

        // Microsoft Graph API Implementation
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("subject", subject);

        Map<String, String> body = new HashMap<>();
        body.put("contentType", "HTML");
        body.put("content", html);
        message.put("body", body);

        Map<String, Object> recipient = new HashMap<>();
        Map<String, String> emailAddress = new HashMap<>();
        emailAddress.put("address", toEmail);
        recipient.put("emailAddress", emailAddress);
        message.put("toRecipients", Collections.singletonList(recipient));

        Map<String, Object> payload = new HashMap<>();
        payload.put("message", message);
        payload.put("saveToSentItems", "true");

        String accessToken = tokenService.getAccessToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
        try {
            ResponseEntity<Void> response = restTemplate.postForEntity(GRAPH_SENDMAIL_URL, request, Void.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Email sent successfully via Graph API to: {}", LogMaskUtil.maskEmail(toEmail));
            } else {
                throw new RuntimeException("Failed to send email via Graph API. Status: " + response.getStatusCode());
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("Graph API Error: {}", e.getResponseBodyAsString());
            throw new RuntimeException("Graph API Error: " + e.getResponseBodyAsString());
        }
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private String buildEmailHtml(User user, EmailSettings settings) {
        LocalDate today = LocalDate.now();
        int month = today.getMonthValue();
        int year = today.getYear();
        String dayOfWeek = today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase();

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html><head><style>")
                .append("body{font-family:Arial,sans-serif;background:#f0f4f8;padding:20px;}")
                .append(".container{max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;}")
                .append(".header{background:linear-gradient(135deg,#6b7c3a,#8a9f4a);color:white;padding:32px;text-align:center;}")
                .append(".section{padding:24px 32px;border-bottom:1px solid #f0f0f0;}")
                .append(".row{display:flex;justify-content:space-between;margin-bottom:8px;}")
                .append(".green{color:#6b7c3a;font-weight:600;}")
                .append(".red{color:#c0392b;font-weight:600;}")
                .append(".blue{color:#2980b9;font-weight:600;}")
                .append(".alert{background:#fff7ed;border-left:4px solid #f97316;padding:10px;margin:4px 0;}")
                .append(".good{background:#f0fdf4;border-left:4px solid #6b7c3a;padding:10px;margin:4px 0;}")
                .append(".plan{background:#f0f4e8;border-left:4px solid #8a9f4a;padding:10px;}")
                .append(".footer{padding:20px;text-align:center;color:#94a3b8;font-size:13px;}")
                .append("</style></head><body><div class='container'>")
                .append("<div class='header'><h1>🌿 OmniHub Daily Summary</h1>")
                .append("<p>").append(today).append(" — ").append(dayOfWeek).append("</p></div>");

        if (settings.isIncludeFinance()) {
            try {
                BigDecimal income = transactionRepository.sumByUserIdAndTypeAndMonthAndYear(user.getId(),
                        TransactionType.INCOME, month, year);
                BigDecimal expenses = transactionRepository.sumByUserIdAndTypeAndMonthAndYear(user.getId(),
                        TransactionType.EXPENSE, month, year);
                if (income == null)
                    income = BigDecimal.ZERO;
                if (expenses == null)
                    expenses = BigDecimal.ZERO;
                BigDecimal balance = income.subtract(expenses);
                String balanceClass = balance.compareTo(BigDecimal.ZERO) >= 0 ? "green" : "red";
                html.append("<div class='section'><h2>💰 Finance Summary</h2>")
                        .append("<div class='row'><span>Monthly Income</span><span class='green'>₹").append(income)
                        .append("</span></div>")
                        .append("<div class='row'><span>Monthly Expenses</span><span class='red'>₹").append(expenses)
                        .append("</span></div>")
                        .append("<div class='row'><span>Balance</span><span class='").append(balanceClass).append("'>₹")
                        .append(balance).append("</span></div>")
                        .append("</div>");
            } catch (Exception e) {
                html.append("<div class='section'><h2>💰 Finance</h2><p>No data yet</p></div>");
            }
        }

        if (settings.isIncludeBudgetAlerts()) {
            try {
                var budgets = budgetRepository.findByUserIdAndMonthNumberAndYear(user.getId(), month, year);
                if (!budgets.isEmpty()) {
                    // Single batch query for all category spending
                    Map<String, BigDecimal> spentByCategory = new HashMap<>();
                    for (Object[] row : transactionRepository.sumExpensesByCategoryForMonth(user.getId(), month, year)) {
                        spentByCategory.put((String) row[0], (BigDecimal) row[1]);
                    }
                    html.append("<div class='section'><h2>🎯 Budget Alerts</h2>");
                    for (var budget : budgets) {
                        BigDecimal spent = spentByCategory.getOrDefault(budget.getCategory(), BigDecimal.ZERO);
                        double pct = budget.getLimitAmount().compareTo(BigDecimal.ZERO) > 0
                                ? spent.divide(budget.getLimitAmount(), 2, java.math.RoundingMode.HALF_UP).doubleValue()
                                        * 100
                                : 0;
                        String cssClass = pct >= 80 ? "alert" : "good";
                        String icon = pct >= 80 ? "⚠️" : "✅";
                        html.append("<div class='").append(cssClass).append("'>")
                                .append(icon).append(" <strong>").append(esc(budget.getCategory())).append("</strong>: ₹")
                                .append(spent).append(" / ₹").append(budget.getLimitAmount())
                                .append(" (").append(String.format("%.0f", pct)).append("%)</div>");
                    }
                    html.append("</div>");
                }
            } catch (Exception ignored) {
            }
        }

        if (settings.isIncludeFitness()) {
            try {
                long totalWorkouts = workoutLogRepository.countByUserId(user.getId());
                String weight = weightLogRepository.findTopByUserIdOrderByDateDesc(user.getId())
                        .map(w -> w.getWeight() + " kg").orElse("No data");
                html.append("<div class='section'><h2>💪 Fitness Summary</h2>")
                        .append("<div class='row'><span>Total Workouts</span><span class='blue'>").append(totalWorkouts)
                        .append("</span></div>")
                        .append("<div class='row'><span>Latest Weight</span><span class='blue'>").append(weight)
                        .append("</span></div>")
                        .append("</div>");
            } catch (Exception e) {
                html.append("<div class='section'><h2>💪 Fitness</h2><p>No data yet</p></div>");
            }
        }

        if (settings.isIncludeWeeklyPlan()) {
            try {
                String day = today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase();
                Optional<WeeklyPlan> plan = weeklyPlanRepository.findByUserIdAndDayOfWeek(user.getId(), day);
                if (plan.isPresent()) {
                    html.append("<div class='section'><h2>📅 Today's Plan (").append(esc(day)).append(")</h2>")
                            .append("<div class='plan'>").append(esc(plan.get().getPlanDescription())).append("</div>")
                            .append("</div>");
                }
            } catch (Exception ignored) {
            }
        }

        html.append("<div class='footer'>OmniHub — Your Personal Tracker 🌿</div>")
                .append("</div></body></html>");

        return html.toString();
    }
}
