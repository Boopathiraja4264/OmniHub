package com.omnihub.productivity.service;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.productivity.dto.ProductivityDTOs.*;
import com.omnihub.productivity.entity.*;
import com.omnihub.productivity.entity.Task.TaskStatus;
import com.omnihub.productivity.entity.TimeBlock.BlockStatus;
import com.omnihub.productivity.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProductivityReportService {

    @Autowired private UserRepository userRepository;
    @Autowired private TaskRepository taskRepository;
    @Autowired private DailyPlanRepository planRepository;
    @Autowired private TimeBlockRepository blockRepository;
    @Autowired private TimeEntryRepository timeEntryRepository;
    @Autowired private FocusScoreRepository focusScoreRepository;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ─── Daily Report ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public DailyReportResponse getDailyReport(String email, LocalDate date) {
        User user = getUser(email);
        DailyReportResponse r = new DailyReportResponse();
        r.setDate(date);

        // Tasks due on this date
        long total    = taskRepository.countByUserIdAndDueDate(user.getId(), date);
        long done     = taskRepository.countDoneByUserIdAndDueDate(user.getId(), date);
        long deferred = taskRepository.findByUserIdAndStatusInAndDueDateBetween(
                user.getId(), List.of(TaskStatus.DEFERRED), date, date).size();
        r.setTasksTotal((int) total);
        r.setTasksDone((int) done);
        r.setTasksDeferred((int) deferred);

        // Blocks from daily plan
        planRepository.findByUserIdAndPlanDate(user.getId(), date).ifPresent(plan -> {
            long planned = blockRepository.countByPlanId(plan.getId());
            long doneBlocks = blockRepository.countByPlanIdAndStatus(plan.getId(), BlockStatus.DONE);
            r.setBlocksPlanned((int) planned);
            r.setBlocksDone((int) doneBlocks);
        });

        // Time logged
        long logged = timeEntryRepository.sumDurationByUserAndDateRange(
                user.getId(), date.atStartOfDay(), date.plusDays(1).atStartOfDay());
        r.setTimeLoggedMinutes(logged);

        // Completion rate
        int totalItems = r.getBlocksPlanned() + r.getTasksTotal();
        int doneItems  = r.getBlocksDone() + r.getTasksDone();
        r.setCompletionRate(totalItems > 0 ? (double) doneItems / totalItems : 0.0);

        return r;
    }

    // ─── Adherence Report ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AdherenceDataPoint> getAdherence(String email, LocalDate from, LocalDate to) {
        User user = getUser(email);
        List<DailyPlan> plans = planRepository.findByUserIdAndPlanDateBetweenOrderByPlanDateAsc(
                user.getId(), from, to);

        List<AdherenceDataPoint> result = new ArrayList<>();

        for (DailyPlan plan : plans) {
            LocalDateTime dayStart = plan.getPlanDate().atStartOfDay();
            LocalDateTime dayEnd   = plan.getPlanDate().plusDays(1).atStartOfDay();

            long logged = timeEntryRepository.sumDurationByUserAndDateRange(user.getId(), dayStart, dayEnd);

            long planned = plan.getTimeBlocks().stream()
                    .mapToLong(b -> Duration.between(b.getStartTime(), b.getEndTime()).toMinutes())
                    .sum();

            // Per category breakdown
            Map<String, CategoryAdherence> byCat = new LinkedHashMap<>();
            for (TimeBlock b : plan.getTimeBlocks()) {
                String cat = b.getCategory().name();
                CategoryAdherence ca = byCat.computeIfAbsent(cat, k -> new CategoryAdherence());
                ca.setPlannedMinutes(ca.getPlannedMinutes() +
                        Duration.between(b.getStartTime(), b.getEndTime()).toMinutes());
            }
            // Assign logged per block via time entries
            List<Object[]> blockLogs = timeEntryRepository.sumDurationByBlockForRange(user.getId(), dayStart, dayEnd);
            Map<Long, Long> blockLogMap = blockLogs.stream()
                    .filter(row -> row[0] != null)
                    .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
            for (TimeBlock b : plan.getTimeBlocks()) {
                String cat = b.getCategory().name();
                long blockLogged = blockLogMap.getOrDefault(b.getId(), 0L);
                CategoryAdherence ca = byCat.get(cat);
                if (ca != null) ca.setLoggedMinutes(ca.getLoggedMinutes() + blockLogged);
            }

            AdherenceDataPoint dp = new AdherenceDataPoint();
            dp.setDate(plan.getPlanDate());
            dp.setPlannedMinutes(planned);
            dp.setLoggedMinutes(logged);
            dp.setAdherenceRate(planned > 0 ? Math.min(1.0, (double) logged / planned) : 0.0);
            dp.setByCategory(byCat);
            result.add(dp);
        }
        return result;
    }

    // ─── FocusScore Compute ──────────────────────────────────────────────────

    @Transactional
    public FocusScoreResponse computeFocusScore(String email, LocalDate date) {
        User user = getUser(email);
        Long userId = user.getId();

        // ── Task Score (40 pts) ──
        List<Task> dueTasks = taskRepository.findByUserIdAndStatusInAndDueDateBetween(
                userId,
                List.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE, TaskStatus.DEFERRED),
                date, date);
        int totalWeight = dueTasks.stream().mapToInt(t -> priorityWeight(t.getPriority())).sum();
        int doneWeight  = dueTasks.stream()
                .filter(t -> t.getStatus() == TaskStatus.DONE)
                .mapToInt(t -> priorityWeight(t.getPriority())).sum();
        BigDecimal taskScore = totalWeight > 0
                ? BigDecimal.valueOf((double) doneWeight / totalWeight * 40).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // ── Block Score (30 pts) ──
        Optional<DailyPlan> planOpt = planRepository.findByUserIdAndPlanDate(userId, date);
        BigDecimal blockScore = BigDecimal.ZERO;
        BigDecimal timeAccScore = BigDecimal.ZERO;
        int blocksPlanned = 0, blocksDone = 0;

        if (planOpt.isPresent()) {
            DailyPlan plan = planOpt.get();
            List<TimeBlock> blocks = plan.getTimeBlocks();
            blocksPlanned = blocks.size();
            blocksDone = (int) blocks.stream().filter(b -> b.getStatus() == BlockStatus.DONE).count();

            if (blocksPlanned > 0) {
                blockScore = BigDecimal.valueOf((double) blocksDone / blocksPlanned * 30)
                        .setScale(2, RoundingMode.HALF_UP);
            }

            // ── Time Accuracy Score (20 pts) ──
            List<TimeBlock> doneBlocks = blocks.stream()
                    .filter(b -> b.getStatus() == BlockStatus.DONE).collect(Collectors.toList());
            if (!doneBlocks.isEmpty()) {
                LocalDateTime dayStart = date.atStartOfDay();
                LocalDateTime dayEnd   = date.plusDays(1).atStartOfDay();
                List<Object[]> blockLogs = timeEntryRepository.sumDurationByBlockForRange(userId, dayStart, dayEnd);
                Map<Long, Long> blockLogMap = blockLogs.stream()
                        .filter(row -> row[0] != null)
                        .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));

                double totalAccuracy = 0;
                for (TimeBlock b : doneBlocks) {
                    long planned = Duration.between(b.getStartTime(), b.getEndTime()).toMinutes();
                    long logged  = blockLogMap.getOrDefault(b.getId(), 0L);
                    long diff    = Math.abs(planned - logged);
                    double acc   = diff <= 15 ? 1.0 : diff <= 30 ? 0.5 : 0.0;
                    totalAccuracy += acc;
                }
                timeAccScore = BigDecimal.valueOf(totalAccuracy / doneBlocks.size() * 20)
                        .setScale(2, RoundingMode.HALF_UP);
            }
        }

        // ── Streak Bonus (10 pts) ──
        BigDecimal streakBonus = BigDecimal.ZERO;
        int streakDays = 0;
        Optional<FocusScore> prevScore = focusScoreRepository
                .findTopByUserIdAndScoreDateBeforeOrderByScoreDateDesc(userId, date);
        if (prevScore.isPresent() && prevScore.get().getTotalScore() != null
                && prevScore.get().getTotalScore().compareTo(BigDecimal.valueOf(70)) >= 0
                && prevScore.get().getScoreDate().equals(date.minusDays(1))) {
            streakDays = prevScore.get().getStreakDays() + 1;
            streakBonus = BigDecimal.valueOf(10);
        }

        BigDecimal total = taskScore.add(blockScore).add(timeAccScore).add(streakBonus)
                .min(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);

        // Upsert
        FocusScore fs = focusScoreRepository.findByUserIdAndScoreDate(userId, date)
                .orElseGet(() -> { FocusScore f = new FocusScore(); f.setUser(user); f.setScoreDate(date); return f; });
        fs.setTaskScore(taskScore);
        fs.setBlockScore(blockScore);
        fs.setTimeAccuracyScore(timeAccScore);
        fs.setStreakBonus(streakBonus);
        fs.setTotalScore(total);
        fs.setStreakDays(streakDays);
        focusScoreRepository.save(fs);

        // Build response
        FocusScoreResponse r = new FocusScoreResponse();
        r.setDate(date);
        r.setTotalScore(total);
        r.setTaskScore(taskScore);
        r.setBlockScore(blockScore);
        r.setTimeAccuracyScore(timeAccScore);
        r.setStreakBonus(streakBonus);
        r.setStreakDays(streakDays);
        r.setLabel(scoreLabel(total));
        r.setTasksPlanned(dueTasks.size());
        r.setTasksDone(doneWeight > 0 ? (int) dueTasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count() : 0);
        r.setBlocksPlanned(blocksPlanned);
        r.setBlocksDone(blocksDone);
        r.setAdherenceRate(blocksPlanned > 0 ? (double) blocksDone / blocksPlanned : 0.0);
        return r;
    }

    @Transactional(readOnly = true)
    public List<ScoreSeriesPoint> getDailyScoreSeries(String email, LocalDate from, LocalDate to) {
        User user = getUser(email);
        return focusScoreRepository.findByUserIdAndScoreDateBetweenOrderByScoreDateAsc(user.getId(), from, to)
                .stream().map(fs -> {
                    ScoreSeriesPoint p = new ScoreSeriesPoint();
                    p.setDate(fs.getScoreDate());
                    p.setScore(fs.getTotalScore());
                    p.setLabel(fs.getTotalScore() != null ? scoreLabel(fs.getTotalScore()) : "N/A");
                    return p;
                }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ScoreSeriesPoint> getWeeklyScoreSeries(String email, int year) {
        User user = getUser(email);
        return focusScoreRepository.weeklyAvgByYear(user.getId(), year).stream().map(row -> {
            ScoreSeriesPoint p = new ScoreSeriesPoint();
            p.setDate(((java.sql.Date) row[0]).toLocalDate());
            BigDecimal score = BigDecimal.valueOf(((Number) row[1]).doubleValue()).setScale(2, RoundingMode.HALF_UP);
            p.setScore(score);
            p.setLabel(scoreLabel(score));
            return p;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ScoreSeriesPoint> getMonthlyScoreSeries(String email, int year) {
        User user = getUser(email);
        return focusScoreRepository.monthlyAvgByYear(user.getId(), year).stream().map(row -> {
            int month = ((Number) row[0]).intValue();
            ScoreSeriesPoint p = new ScoreSeriesPoint();
            p.setDate(LocalDate.of(year, month, 1));
            BigDecimal score = BigDecimal.valueOf(((Number) row[1]).doubleValue()).setScale(2, RoundingMode.HALF_UP);
            p.setScore(score);
            p.setLabel(scoreLabel(score));
            return p;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductivityDashboardResponse getDashboard(String email) {
        User user = getUser(email);
        LocalDate today = LocalDate.now();

        ProductivityDashboardResponse r = new ProductivityDashboardResponse();

        // Today's score — read last stored (compute separately via POST /focus-score/compute)
        focusScoreRepository.findByUserIdAndScoreDate(user.getId(), today).ifPresent(fs -> {
            FocusScoreResponse sr = new FocusScoreResponse();
            sr.setDate(fs.getScoreDate());
            sr.setTotalScore(fs.getTotalScore());
            sr.setTaskScore(fs.getTaskScore());
            sr.setBlockScore(fs.getBlockScore());
            sr.setTimeAccuracyScore(fs.getTimeAccuracyScore());
            sr.setStreakBonus(fs.getStreakBonus());
            sr.setStreakDays(fs.getStreakDays());
            sr.setLabel(scoreLabel(fs.getTotalScore() != null ? fs.getTotalScore() : java.math.BigDecimal.ZERO));
            r.setTodayScore(sr);
        });

        // Week avg
        LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);
        List<FocusScore> weekScores = focusScoreRepository
                .findByUserIdAndScoreDateBetweenOrderByScoreDateAsc(user.getId(), weekStart, today);
        r.setWeekAvgScore(avg(weekScores));

        // Month avg
        LocalDate monthStart = today.withDayOfMonth(1);
        List<FocusScore> monthScores = focusScoreRepository
                .findByUserIdAndScoreDateBetweenOrderByScoreDateAsc(user.getId(), monthStart, today);
        r.setMonthAvgScore(avg(monthScores));

        // Streak
        r.setCurrentStreak(focusScoreRepository.findTopByUserIdAndScoreDateBeforeOrderByScoreDateDesc(user.getId(), today.plusDays(1))
                .map(FocusScore::getStreakDays).orElse(0));

        // Today blocks
        planRepository.findByUserIdAndPlanDate(user.getId(), today).ifPresent(plan -> {
            r.setTodayBlocksTotal((int) blockRepository.countByPlanId(plan.getId()));
            r.setTodayBlocksDone((int) blockRepository.countByPlanIdAndStatus(plan.getId(), BlockStatus.DONE));
        });

        // Pending tasks
        r.setPendingTasks(taskRepository.findActiveTasks(user.getId()).size());

        // Active timer
        user.getId();
        timeEntryRepository.findByUserIdAndEndedAtIsNull(user.getId()).ifPresent(entry -> {
            TimeEntryResponse te = new TimeEntryResponse();
            te.setId(entry.getId());
            te.setTaskId(entry.getTaskId());
            te.setBlockId(entry.getBlockId());
            te.setDescription(entry.getDescription());
            te.setStartedAt(entry.getStartedAt());
            te.setRunning(true);
            r.setTimerRunning(true);
            r.setActiveTimer(te);
        });

        return r;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private int priorityWeight(Task.TaskPriority p) {
        return switch (p) {
            case LOW -> 1; case MEDIUM -> 2; case HIGH -> 3; case URGENT -> 4;
        };
    }

    private String scoreLabel(BigDecimal score) {
        double v = score.doubleValue();
        if (v >= 85) return "Excellent";
        if (v >= 70) return "Good";
        if (v >= 50) return "Fair";
        if (v >= 30) return "Poor";
        return "Off-track";
    }

    private BigDecimal avg(List<FocusScore> scores) {
        return scores.stream()
                .filter(s -> s.getTotalScore() != null)
                .map(FocusScore::getTotalScore)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(Math.max(scores.size(), 1)), 2, RoundingMode.HALF_UP);
    }
}
