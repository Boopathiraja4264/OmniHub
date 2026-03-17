package com.omnihub.notification.service;

import com.omnihub.core.entity.User;
import com.omnihub.finance.entity.Transaction.TransactionType;
import com.omnihub.finance.repository.BudgetRepository;
import com.omnihub.finance.repository.TransactionRepository;
import com.omnihub.fitness.entity.WeeklyPlan;
import com.omnihub.fitness.repository.StepsLogRepository;
import com.omnihub.fitness.repository.StepsTargetRepository;
import com.omnihub.fitness.repository.WeeklyPlanRepository;
import com.omnihub.fitness.repository.WeightLogRepository;
import com.omnihub.fitness.repository.WorkoutLogRepository;
import com.omnihub.notification.entity.SlackSettings;
import com.omnihub.notification.repository.SlackSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.*;

@Service
public class SlackService {

    @Autowired private SlackSettingsRepository slackSettingsRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private BudgetRepository budgetRepository;
    @Autowired private WorkoutLogRepository workoutLogRepository;
    @Autowired private WeightLogRepository weightLogRepository;
    @Autowired private WeeklyPlanRepository weeklyPlanRepository;
    @Autowired private StepsLogRepository stepsLogRepository;
    @Autowired private StepsTargetRepository stepsTargetRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    // ── Morning reminder — fires every minute, matches per time slot ─────────

    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void sendScheduledSlack() {
        LocalTime now = LocalTime.now(ZoneId.of("Asia/Kolkata"));
        int h = now.getHour(), m = now.getMinute();

        for (SlackSettings s : slackSettingsRepository.findAllEnabledAtTime1(h, m)) {
            dispatch(s, s.getTemplate1() != null ? s.getTemplate1() : "MORNING");
        }
        for (SlackSettings s : slackSettingsRepository.findAllEnabledAtTime2(h, m)) {
            dispatch(s, s.getTemplate2() != null ? s.getTemplate2() : "MORNING");
        }
    }

    // ── 7 PM deadline alert ──────────────────────────────────────────────────

    @Scheduled(cron = "0 0 19 * * *", zone = "Asia/Kolkata")
    @Transactional
    public void sendDeadlineAlert() {
        for (SlackSettings s : slackSettingsRepository.findAll()) {
            if (!s.isEnabled() || s.getWebhookUrl() == null || s.getWebhookUrl().isBlank()) continue;
            try {
                Map<String, Object> payload = buildDeadlinePayload(s.getUser());
                if (payload != null) sendWebhook(s.getWebhookUrl(), payload);
            } catch (Exception e) {
                System.err.println("Slack deadline alert failed for " + s.getUser().getEmail() + ": " + e.getMessage());
            }
        }
    }

    // ── Public: send test (uses template1) ───────────────────────────────────

    public void sendSlack(SlackSettings settings) {
        if (settings.getWebhookUrl() == null || settings.getWebhookUrl().isBlank()) {
            throw new RuntimeException("No Slack webhook URL configured");
        }
        String template = settings.getTemplate1() != null ? settings.getTemplate1() : "MORNING";
        Map<String, Object> payload = buildPayloadForTemplate(settings.getUser(), settings, template);
        sendWebhook(settings.getWebhookUrl(), payload);
        System.out.println("Slack message sent for user: " + settings.getUser().getEmail());
    }

    // ── Internal dispatch ────────────────────────────────────────────────────

    private void dispatch(SlackSettings s, String template) {
        try {
            Map<String, Object> payload = buildPayloadForTemplate(s.getUser(), s, template);
            sendWebhook(s.getWebhookUrl(), payload);
            System.out.println("Slack [" + template + "] sent for: " + s.getUser().getEmail());
        } catch (Exception e) {
            System.err.println("Slack failed for " + s.getUser().getEmail() + ": " + e.getMessage());
        }
    }

    private Map<String, Object> buildPayloadForTemplate(User user, SlackSettings settings, String template) {
        return switch (template.toUpperCase()) {
            case "FINANCE" -> buildFinancePayload(user, settings);
            case "FULL"    -> buildFullPayload(user, settings);
            default        -> buildMorningPayload(user, settings);
        };
    }

    private void sendWebhook(String webhookUrl, Map<String, Object> payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> response = restTemplate.postForEntity(
                webhookUrl, new HttpEntity<>(payload, headers), String.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Slack webhook error: " + response.getBody());
        }
    }

    // ── MORNING template — fitness focus ─────────────────────────────────────

    private Map<String, Object> buildMorningPayload(User user, SlackSettings settings) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));

        String dateStr = today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase()
                + ", " + today.getDayOfMonth() + " "
                + today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + today.getYear();

        String[] parts = user.getFullName() != null ? user.getFullName().trim().split("\\s+") : new String[]{};
        String firstName = parts.length > 0 && !parts[0].isEmpty() ? parts[0] : "there";

        List<Map<String, Object>> blocks = new ArrayList<>();
        blocks.add(block("header", plainText("🌅 Good Morning, " + firstName + "!")));
        blocks.add(block("context", List.of(mrkdwn(dateStr))));
        blocks.add(divider());

        // Weight goal for upcoming Sunday + today's steps side by side
        if (settings.isIncludeWeight() && settings.isIncludeWeeklyPlan()) {
            blocks.add(sectionFields(buildWeightGoalText(user.getId(), today),
                                     buildStepsText(user.getId(), today)));
            blocks.add(divider());
        } else if (settings.isIncludeWeight()) {
            blocks.add(sectionText(buildWeightGoalText(user.getId(), today)));
            blocks.add(divider());
        } else if (settings.isIncludeWeeklyPlan()) {
            blocks.add(sectionText(buildStepsText(user.getId(), today)));
            blocks.add(divider());
        }

        // Full week workout plan
        if (settings.isIncludeWorkout()) {
            blocks.add(sectionText(buildWeeklyPlanText(user.getId(), today)));
            blocks.add(divider());
        }

        blocks.add(block("context", List.of(mrkdwn("OmniHub — Stay on track today! 🌿"))));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("blocks", blocks);
        return payload;
    }

    // ── FINANCE template ─────────────────────────────────────────────────────

    private Map<String, Object> buildFinancePayload(User user, SlackSettings settings) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        int month = today.getMonthValue(), year = today.getYear();

        String dateStr = today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase()
                + ", " + today.getDayOfMonth() + " "
                + today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + year;

        List<Map<String, Object>> blocks = new ArrayList<>();
        blocks.add(block("header", plainText("💰 Finance Summary")));
        blocks.add(block("context", List.of(mrkdwn(dateStr))));
        blocks.add(divider());

        appendFinanceBlocks(blocks, user, settings, month, year);

        blocks.add(block("context", List.of(mrkdwn("OmniHub — Your Finance Tracker 🌿"))));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("blocks", blocks);
        return payload;
    }

    // ── FULL template — planned vs achieved status table ─────────────────────

    private Map<String, Object> buildFullPayload(User user, SlackSettings settings) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));

        String dateStr = today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase()
                + ", " + today.getDayOfMonth() + " "
                + today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + today.getYear();

        List<Map<String, Object>> blocks = new ArrayList<>();
        blocks.add(block("header", plainText("📊 Daily Status Report")));
        blocks.add(block("context", List.of(mrkdwn(dateStr))));
        blocks.add(divider());

        // ── FITNESS STATUS TABLE ──────────────────────────────────────────────
        StringBuilder fitness = new StringBuilder("*🏋️ FITNESS STATUS*\n\n");

        // Workout
        if (settings.isIncludeWorkout()) {
            String todayDay = today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase();
            String dayDisplay = todayDay.charAt(0) + todayDay.substring(1).toLowerCase();
            String plan = weeklyPlanRepository.findByUserIdAndDayOfWeek(user.getId(), todayDay)
                    .map(p -> p.getPlanDescription() != null && !p.getPlanDescription().isBlank()
                            ? p.getPlanDescription() : "Rest day")
                    .orElse("Rest day");

            boolean workoutLogged = workoutLogRepository.findByUserIdAndDate(user.getId(), today).isPresent();
            boolean isRestDay = plan.equalsIgnoreCase("Rest day");

            fitness.append("*💪 Workout (").append(dayDisplay).append(")*\n");
            fitness.append("  Planned: ").append(plan).append("\n");
            if (isRestDay) {
                fitness.append("  Status: 🛌 Rest day\n\n");
            } else if (workoutLogged) {
                fitness.append("  Status: ✅ Logged\n\n");
            } else {
                fitness.append("  Status: 🔴 *CRITICAL — Not logged yet*\n\n");
            }
        }

        // Steps & Run
        if (settings.isIncludeWeeklyPlan()) {
            String stepsTarget = stepsTargetRepository.findTopByUserIdOrderBySetDateDesc(user.getId())
                    .map(t -> {
                        String s = String.format("%,d", t.getTargetSteps()) + " steps";
                        if (t.getTargetRunKm() != null && t.getTargetRunKm() > 0)
                            s += " + " + t.getTargetRunKm() + " km run";
                        return s;
                    }).orElse("No target set");

            fitness.append("*👟 Steps & Run*\n");
            fitness.append("  Planned: ").append(stepsTarget).append("\n");

            stepsLogRepository.findByUserIdAndDate(user.getId(), today).ifPresentOrElse(s -> {
                String logged = String.format("%,d", s.getSteps() != null ? s.getSteps() : 0) + " steps";
                if (s.getRunKm() != null && s.getRunKm() > 0) logged += " + " + s.getRunKm() + " km run";

                // check if target met
                boolean stepsMet = stepsTargetRepository.findTopByUserIdOrderBySetDateDesc(user.getId())
                        .map(t -> s.getSteps() != null && s.getSteps() >= t.getTargetSteps())
                        .orElse(true);
                fitness.append("  Achieved: ").append(logged).append("\n");
                fitness.append("  Status: ").append(stepsMet ? "✅ Target met" : "⚠️ Below target").append("\n\n");
            }, () -> fitness.append("  Status: 🔴 *CRITICAL — Not logged yet*\n\n"));
        }

        blocks.add(sectionText(fitness.toString().trim()));
        blocks.add(divider());

        blocks.add(block("context", List.of(mrkdwn("OmniHub — Your Personal Tracker 🌿"))));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("blocks", blocks);
        return payload;
    }

    // ── Finance blocks helper (shared between FINANCE and FULL) ──────────────

    private void appendFinanceBlocks(List<Map<String, Object>> blocks, User user,
                                     SlackSettings settings, int month, int year) {
        if (settings.isIncludeTransactions()) {
            try {
                BigDecimal income = transactionRepository.sumByUserIdAndTypeAndMonthAndYear(
                        user.getId(), TransactionType.INCOME, month, year);
                BigDecimal expenses = transactionRepository.sumByUserIdAndTypeAndMonthAndYear(
                        user.getId(), TransactionType.EXPENSE, month, year);
                if (income == null) income = BigDecimal.ZERO;
                if (expenses == null) expenses = BigDecimal.ZERO;
                BigDecimal balance = income.subtract(expenses);
                String sign = balance.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "";
                blocks.add(sectionFields(
                        "*💰 Income (this month)*\n₹" + income.toBigInteger(),
                        "*💸 Expenses (this month)*\n₹" + expenses.toBigInteger()
                ));
                blocks.add(sectionText("*Net Balance:* " + sign + "₹" + balance.toBigInteger()));
                blocks.add(divider());
            } catch (Exception ignored) {}
        }

        if (settings.isIncludeBudget()) {
            try {
                var budgets = budgetRepository.findByUserIdAndMonthNumberAndYear(user.getId(), month, year);
                if (!budgets.isEmpty()) {
                    Map<String, BigDecimal> spentByCategory = new HashMap<>();
                    for (Object[] row : transactionRepository.sumExpensesByCategoryForMonth(user.getId(), month, year)) {
                        spentByCategory.put((String) row[0], (BigDecimal) row[1]);
                    }
                    StringBuilder budgetText = new StringBuilder("*🎯 Budget Status*\n");
                    for (var budget : budgets) {
                        BigDecimal spent = spentByCategory.getOrDefault(budget.getCategory(), BigDecimal.ZERO);
                        if (budget.getLimitAmount().compareTo(BigDecimal.ZERO) > 0) {
                            double pct = spent.divide(budget.getLimitAmount(), 2, java.math.RoundingMode.HALF_UP)
                                    .doubleValue() * 100;
                            String icon = pct >= 100 ? "🔴" : pct >= 80 ? "🟡" : "🟢";
                            budgetText.append(icon).append(" ").append(budget.getCategory())
                                    .append(": ₹").append(spent.toBigInteger())
                                    .append(" / ₹").append(budget.getLimitAmount().toBigInteger())
                                    .append(" (").append(String.format("%.0f", pct)).append("%)\n");
                        }
                    }
                    blocks.add(sectionText(budgetText.toString().trim()));
                    blocks.add(divider());
                }
            } catch (Exception ignored) {}
        }
    }

    // ── 7 PM alert payload (null = nothing to alert) ─────────────────────────

    private Map<String, Object> buildDeadlinePayload(User user) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        boolean workoutLogged = workoutLogRepository.findByUserIdAndDate(user.getId(), today).isPresent();
        boolean stepsLogged   = stepsLogRepository.findByUserIdAndDate(user.getId(), today).isPresent();
        if (workoutLogged && stepsLogged) return null;

        List<Map<String, Object>> blocks = new ArrayList<>();
        blocks.add(block("header", plainText("⚠️ Evening Check-in — 7 PM Reminder")));
        String dateStr = today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH)
                + ", " + today.getDayOfMonth() + " "
                + today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        blocks.add(block("context", List.of(mrkdwn(dateStr))));
        blocks.add(divider());

        StringBuilder alertText = new StringBuilder();
        if (!workoutLogged) alertText.append("❌ *Workout* not logged today\n");
        if (!stepsLogged)   alertText.append("❌ *Steps & Run* not logged today\n");
        blocks.add(sectionText(alertText.toString().trim()));
        blocks.add(sectionText("You still have time — log your activity before midnight! 💪"));
        blocks.add(divider());
        blocks.add(block("context", List.of(mrkdwn("OmniHub — Don't break your streak! 🌿"))));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("blocks", blocks);
        return payload;
    }

    // ── Content builders ─────────────────────────────────────────────────────

    private String buildWeightGoalText(Long userId, LocalDate today) {
        int daysToSunday = (7 - today.getDayOfWeek().getValue()) % 7;
        LocalDate sunday = daysToSunday == 0 ? today : today.plusDays(daysToSunday);
        String sundayLabel = sunday.getDayOfMonth() + " "
                + sunday.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);

        String currentWeight = weightLogRepository.findTopByUserIdOrderByDateDesc(userId)
                .map(w -> w.getWeight() + " kg").orElse("—");
        String targetWeight = weightLogRepository.findTopByUserIdOrderByDateDesc(userId)
                .map(w -> w.getWeeklyTarget() != null ? w.getWeeklyTarget() + " kg" : "Not set")
                .orElse("Not set");

        return "*⚖️ Weight Goal*\nCurrent: " + currentWeight
                + "\nTarget by " + sundayLabel + ": *" + targetWeight + "*";
    }

    private String buildStepsText(Long userId, LocalDate today) {
        String target = stepsTargetRepository.findTopByUserIdOrderBySetDateDesc(userId)
                .map(t -> {
                    String s = String.format("%,d", t.getTargetSteps()) + " steps";
                    if (t.getTargetRunKm() != null && t.getTargetRunKm() > 0)
                        s += " + " + t.getTargetRunKm() + " km run";
                    return s;
                }).orElse("No target set");

        String todayLog = stepsLogRepository.findByUserIdAndDate(userId, today)
                .map(s -> {
                    String log = String.format("%,d", s.getSteps() != null ? s.getSteps() : 0) + " steps";
                    if (s.getRunKm() != null && s.getRunKm() > 0) log += " + " + s.getRunKm() + " km";
                    return "✅ " + log;
                }).orElse("⏳ Not logged yet");

        return "*👟 Steps & Run*\nTarget: " + target + "\nToday: " + todayLog;
    }

    private String buildWeeklyPlanText(Long userId, LocalDate today) {
        String todayDay = today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase();
        String dayDisplay = todayDay.charAt(0) + todayDay.substring(1).toLowerCase();

        String planDesc = weeklyPlanRepository.findByUserIdAndDayOfWeek(userId, todayDay)
                .map(WeeklyPlan::getPlanDescription)
                .orElse(null);

        boolean workoutDone = workoutLogRepository.findByUserIdAndDate(userId, today).isPresent();
        String status = workoutDone ? "✅ Logged" : "⏳ Not logged yet";

        if (planDesc == null || planDesc.isBlank()) {
            return "*💪 Today's Workout (" + dayDisplay + ")*\nRest day 🛌\n" + status;
        }

        return "*💪 Today's Workout (" + dayDisplay + ")*\n" + planDesc + "\n" + status;
    }

    // ── Block Kit helpers ────────────────────────────────────────────────────

    private Map<String, Object> block(String type, Object text) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", type);
        m.put("text", text);
        return m;
    }

    private Map<String, Object> block(String type, List<?> elements) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", type);
        m.put("elements", elements);
        return m;
    }

    private Map<String, Object> divider() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "divider");
        return m;
    }

    private Map<String, Object> sectionText(String text) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "section");
        m.put("text", mrkdwn(text));
        return m;
    }

    private Map<String, Object> sectionFields(String left, String right) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "section");
        m.put("fields", List.of(mrkdwn(left), mrkdwn(right)));
        return m;
    }

    private Map<String, Object> mrkdwn(String text) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "mrkdwn");
        m.put("text", text);
        return m;
    }

    private Map<String, Object> plainText(String text) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "plain_text");
        m.put("text", text);
        m.put("emoji", true);
        return m;
    }
}
