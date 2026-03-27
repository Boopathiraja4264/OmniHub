package com.omnihub.productivity.dto;

import com.omnihub.productivity.entity.Task.TaskCategory;
import com.omnihub.productivity.entity.Task.TaskPriority;
import com.omnihub.productivity.entity.Task.TaskRecurring;
import com.omnihub.productivity.entity.Task.TaskStatus;
import com.omnihub.productivity.entity.TimeBlock.BlockCategory;
import com.omnihub.productivity.entity.TimeBlock.BlockStatus;
import com.omnihub.productivity.entity.DailyPlan.PlanStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public class ProductivityDTOs {

    // ─── Task ────────────────────────────────────────────────────────────────

    public static class TaskRequest {
        @NotBlank private String title;
        private String description;
        @NotNull private TaskCategory category;
        private TaskPriority priority = TaskPriority.MEDIUM;
        private LocalDate dueDate;
        private Integer estimatedMinutes;
        private TaskRecurring recurring = TaskRecurring.NONE;
        private Long parentTaskId;

        public String getTitle() { return title; }
        public void setTitle(String v) { title = v; }
        public String getDescription() { return description; }
        public void setDescription(String v) { description = v; }
        public TaskCategory getCategory() { return category; }
        public void setCategory(TaskCategory v) { category = v; }
        public TaskPriority getPriority() { return priority; }
        public void setPriority(TaskPriority v) { priority = v; }
        public LocalDate getDueDate() { return dueDate; }
        public void setDueDate(LocalDate v) { dueDate = v; }
        public Integer getEstimatedMinutes() { return estimatedMinutes; }
        public void setEstimatedMinutes(Integer v) { estimatedMinutes = v; }
        public TaskRecurring getRecurring() { return recurring; }
        public void setRecurring(TaskRecurring v) { recurring = v; }
        public Long getParentTaskId() { return parentTaskId; }
        public void setParentTaskId(Long v) { parentTaskId = v; }
    }

    public static class TaskStatusRequest {
        @NotNull private TaskStatus status;
        public TaskStatus getStatus() { return status; }
        public void setStatus(TaskStatus v) { status = v; }
    }

    public static class TaskResponse {
        private Long id;
        private String title, description;
        private TaskCategory category;
        private TaskStatus status;
        private TaskPriority priority;
        private LocalDate dueDate;
        private Integer estimatedMinutes;
        private TaskRecurring recurring;
        private Long parentTaskId;
        private LocalDateTime createdAt, updatedAt, completedAt;

        public Long getId() { return id; }
        public void setId(Long v) { id = v; }
        public String getTitle() { return title; }
        public void setTitle(String v) { title = v; }
        public String getDescription() { return description; }
        public void setDescription(String v) { description = v; }
        public TaskCategory getCategory() { return category; }
        public void setCategory(TaskCategory v) { category = v; }
        public TaskStatus getStatus() { return status; }
        public void setStatus(TaskStatus v) { status = v; }
        public TaskPriority getPriority() { return priority; }
        public void setPriority(TaskPriority v) { priority = v; }
        public LocalDate getDueDate() { return dueDate; }
        public void setDueDate(LocalDate v) { dueDate = v; }
        public Integer getEstimatedMinutes() { return estimatedMinutes; }
        public void setEstimatedMinutes(Integer v) { estimatedMinutes = v; }
        public TaskRecurring getRecurring() { return recurring; }
        public void setRecurring(TaskRecurring v) { recurring = v; }
        public Long getParentTaskId() { return parentTaskId; }
        public void setParentTaskId(Long v) { parentTaskId = v; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime v) { createdAt = v; }
        public LocalDateTime getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(LocalDateTime v) { updatedAt = v; }
        public LocalDateTime getCompletedAt() { return completedAt; }
        public void setCompletedAt(LocalDateTime v) { completedAt = v; }
    }

    // ─── Daily Plan ──────────────────────────────────────────────────────────

    public static class DailyPlanRequest {
        @NotNull private LocalDate planDate;
        private String notes;

        public LocalDate getPlanDate() { return planDate; }
        public void setPlanDate(LocalDate v) { planDate = v; }
        public String getNotes() { return notes; }
        public void setNotes(String v) { notes = v; }
    }

    public static class DailyPlanUpdateRequest {
        private String notes;
        private PlanStatus status;

        public String getNotes() { return notes; }
        public void setNotes(String v) { notes = v; }
        public PlanStatus getStatus() { return status; }
        public void setStatus(PlanStatus v) { status = v; }
    }

    public static class DailyPlanResponse {
        private Long id;
        private LocalDate planDate;
        private String notes;
        private PlanStatus status;
        private List<TimeBlockResponse> timeBlocks;
        private LocalDateTime createdAt;

        public Long getId() { return id; }
        public void setId(Long v) { id = v; }
        public LocalDate getPlanDate() { return planDate; }
        public void setPlanDate(LocalDate v) { planDate = v; }
        public String getNotes() { return notes; }
        public void setNotes(String v) { notes = v; }
        public PlanStatus getStatus() { return status; }
        public void setStatus(PlanStatus v) { status = v; }
        public List<TimeBlockResponse> getTimeBlocks() { return timeBlocks; }
        public void setTimeBlocks(List<TimeBlockResponse> v) { timeBlocks = v; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime v) { createdAt = v; }
    }

    // ─── Time Block ──────────────────────────────────────────────────────────

    public static class TimeBlockRequest {
        @NotBlank private String title;
        @NotNull  private BlockCategory category;
        @NotNull  private LocalTime startTime;
        @NotNull  private LocalTime endTime;
        private Long taskId;
        private String color;
        private String notes;
        private int sortOrder = 0;

        public String getTitle() { return title; }
        public void setTitle(String v) { title = v; }
        public BlockCategory getCategory() { return category; }
        public void setCategory(BlockCategory v) { category = v; }
        public LocalTime getStartTime() { return startTime; }
        public void setStartTime(LocalTime v) { startTime = v; }
        public LocalTime getEndTime() { return endTime; }
        public void setEndTime(LocalTime v) { endTime = v; }
        public Long getTaskId() { return taskId; }
        public void setTaskId(Long v) { taskId = v; }
        public String getColor() { return color; }
        public void setColor(String v) { color = v; }
        public String getNotes() { return notes; }
        public void setNotes(String v) { notes = v; }
        public int getSortOrder() { return sortOrder; }
        public void setSortOrder(int v) { sortOrder = v; }
    }

    public static class BlockStatusRequest {
        @NotNull private BlockStatus status;
        public BlockStatus getStatus() { return status; }
        public void setStatus(BlockStatus v) { status = v; }
    }

    public static class TimeBlockResponse {
        private Long id, planId, taskId;
        private String title, color, notes;
        private BlockCategory category;
        private LocalTime startTime, endTime;
        private BlockStatus status;
        private int sortOrder;
        private Integer plannedMinutes;

        public Long getId() { return id; }
        public void setId(Long v) { id = v; }
        public Long getPlanId() { return planId; }
        public void setPlanId(Long v) { planId = v; }
        public Long getTaskId() { return taskId; }
        public void setTaskId(Long v) { taskId = v; }
        public String getTitle() { return title; }
        public void setTitle(String v) { title = v; }
        public String getColor() { return color; }
        public void setColor(String v) { color = v; }
        public String getNotes() { return notes; }
        public void setNotes(String v) { notes = v; }
        public BlockCategory getCategory() { return category; }
        public void setCategory(BlockCategory v) { category = v; }
        public LocalTime getStartTime() { return startTime; }
        public void setStartTime(LocalTime v) { startTime = v; }
        public LocalTime getEndTime() { return endTime; }
        public void setEndTime(LocalTime v) { endTime = v; }
        public BlockStatus getStatus() { return status; }
        public void setStatus(BlockStatus v) { status = v; }
        public int getSortOrder() { return sortOrder; }
        public void setSortOrder(int v) { sortOrder = v; }
        public Integer getPlannedMinutes() { return plannedMinutes; }
        public void setPlannedMinutes(Integer v) { plannedMinutes = v; }
    }

    // ─── Time Entry / Timer ──────────────────────────────────────────────────

    public static class StartTimerRequest {
        private Long taskId;
        private Long blockId;
        private String description;

        public Long getTaskId() { return taskId; }
        public void setTaskId(Long v) { taskId = v; }
        public Long getBlockId() { return blockId; }
        public void setBlockId(Long v) { blockId = v; }
        public String getDescription() { return description; }
        public void setDescription(String v) { description = v; }
    }

    public static class TimeEntryResponse {
        private Long id, taskId, blockId;
        private String description;
        private LocalDateTime startedAt, endedAt;
        private Integer durationMinutes;
        private boolean running;

        public Long getId() { return id; }
        public void setId(Long v) { id = v; }
        public Long getTaskId() { return taskId; }
        public void setTaskId(Long v) { taskId = v; }
        public Long getBlockId() { return blockId; }
        public void setBlockId(Long v) { blockId = v; }
        public String getDescription() { return description; }
        public void setDescription(String v) { description = v; }
        public LocalDateTime getStartedAt() { return startedAt; }
        public void setStartedAt(LocalDateTime v) { startedAt = v; }
        public LocalDateTime getEndedAt() { return endedAt; }
        public void setEndedAt(LocalDateTime v) { endedAt = v; }
        public Integer getDurationMinutes() { return durationMinutes; }
        public void setDurationMinutes(Integer v) { durationMinutes = v; }
        public boolean isRunning() { return running; }
        public void setRunning(boolean v) { running = v; }
    }

    // ─── Weekly Template ─────────────────────────────────────────────────────

    public static class WeeklyTemplateRequest {
        @NotBlank private String name;
        private boolean active = true;

        public String getName() { return name; }
        public void setName(String v) { name = v; }
        public boolean isActive() { return active; }
        public void setActive(boolean v) { active = v; }
    }

    public static class WeeklyTemplateResponse {
        private Long id;
        private String name;
        private boolean active;
        private List<TemplateBlockResponse> blocks;
        private LocalDateTime createdAt;

        public Long getId() { return id; }
        public void setId(Long v) { id = v; }
        public String getName() { return name; }
        public void setName(String v) { name = v; }
        public boolean isActive() { return active; }
        public void setActive(boolean v) { active = v; }
        public List<TemplateBlockResponse> getBlocks() { return blocks; }
        public void setBlocks(List<TemplateBlockResponse> v) { blocks = v; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime v) { createdAt = v; }
    }

    public static class TemplateBlockRequest {
        @NotBlank private String dayOfWeek;
        @NotBlank private String title;
        @NotNull  private BlockCategory category;
        @NotNull  private LocalTime startTime;
        @NotNull  private LocalTime endTime;
        private String color;
        private int sortOrder = 0;

        public String getDayOfWeek() { return dayOfWeek; }
        public void setDayOfWeek(String v) { dayOfWeek = v; }
        public String getTitle() { return title; }
        public void setTitle(String v) { title = v; }
        public BlockCategory getCategory() { return category; }
        public void setCategory(BlockCategory v) { category = v; }
        public LocalTime getStartTime() { return startTime; }
        public void setStartTime(LocalTime v) { startTime = v; }
        public LocalTime getEndTime() { return endTime; }
        public void setEndTime(LocalTime v) { endTime = v; }
        public String getColor() { return color; }
        public void setColor(String v) { color = v; }
        public int getSortOrder() { return sortOrder; }
        public void setSortOrder(int v) { sortOrder = v; }
    }

    public static class TemplateBlockResponse {
        private Long id, templateId;
        private String dayOfWeek, title, color;
        private BlockCategory category;
        private LocalTime startTime, endTime;
        private int sortOrder;

        public Long getId() { return id; }
        public void setId(Long v) { id = v; }
        public Long getTemplateId() { return templateId; }
        public void setTemplateId(Long v) { templateId = v; }
        public String getDayOfWeek() { return dayOfWeek; }
        public void setDayOfWeek(String v) { dayOfWeek = v; }
        public String getTitle() { return title; }
        public void setTitle(String v) { title = v; }
        public String getColor() { return color; }
        public void setColor(String v) { color = v; }
        public BlockCategory getCategory() { return category; }
        public void setCategory(BlockCategory v) { category = v; }
        public LocalTime getStartTime() { return startTime; }
        public void setStartTime(LocalTime v) { startTime = v; }
        public LocalTime getEndTime() { return endTime; }
        public void setEndTime(LocalTime v) { endTime = v; }
        public int getSortOrder() { return sortOrder; }
        public void setSortOrder(int v) { sortOrder = v; }
    }

    // ─── Reports ─────────────────────────────────────────────────────────────

    public static class DailyReportResponse {
        private LocalDate date;
        private int tasksTotal, tasksDone, tasksDeferred;
        private int blocksPlanned, blocksDone;
        private long timeLoggedMinutes;
        private double completionRate;

        public LocalDate getDate() { return date; }
        public void setDate(LocalDate v) { date = v; }
        public int getTasksTotal() { return tasksTotal; }
        public void setTasksTotal(int v) { tasksTotal = v; }
        public int getTasksDone() { return tasksDone; }
        public void setTasksDone(int v) { tasksDone = v; }
        public int getTasksDeferred() { return tasksDeferred; }
        public void setTasksDeferred(int v) { tasksDeferred = v; }
        public int getBlocksPlanned() { return blocksPlanned; }
        public void setBlocksPlanned(int v) { blocksPlanned = v; }
        public int getBlocksDone() { return blocksDone; }
        public void setBlocksDone(int v) { blocksDone = v; }
        public long getTimeLoggedMinutes() { return timeLoggedMinutes; }
        public void setTimeLoggedMinutes(long v) { timeLoggedMinutes = v; }
        public double getCompletionRate() { return completionRate; }
        public void setCompletionRate(double v) { completionRate = v; }
    }

    public static class AdherenceDataPoint {
        private LocalDate date;
        private long plannedMinutes, loggedMinutes;
        private double adherenceRate;
        private Map<String, CategoryAdherence> byCategory;

        public LocalDate getDate() { return date; }
        public void setDate(LocalDate v) { date = v; }
        public long getPlannedMinutes() { return plannedMinutes; }
        public void setPlannedMinutes(long v) { plannedMinutes = v; }
        public long getLoggedMinutes() { return loggedMinutes; }
        public void setLoggedMinutes(long v) { loggedMinutes = v; }
        public double getAdherenceRate() { return adherenceRate; }
        public void setAdherenceRate(double v) { adherenceRate = v; }
        public Map<String, CategoryAdherence> getByCategory() { return byCategory; }
        public void setByCategory(Map<String, CategoryAdherence> v) { byCategory = v; }
    }

    public static class CategoryAdherence {
        private long plannedMinutes, loggedMinutes;
        public long getPlannedMinutes() { return plannedMinutes; }
        public void setPlannedMinutes(long v) { plannedMinutes = v; }
        public long getLoggedMinutes() { return loggedMinutes; }
        public void setLoggedMinutes(long v) { loggedMinutes = v; }
    }

    public static class FocusScoreResponse {
        private LocalDate date;
        private BigDecimal totalScore, taskScore, blockScore, timeAccuracyScore, streakBonus;
        private int streakDays;
        private String label;
        private int tasksPlanned, tasksDone, blocksPlanned, blocksDone;
        private double adherenceRate;

        public LocalDate getDate() { return date; }
        public void setDate(LocalDate v) { date = v; }
        public BigDecimal getTotalScore() { return totalScore; }
        public void setTotalScore(BigDecimal v) { totalScore = v; }
        public BigDecimal getTaskScore() { return taskScore; }
        public void setTaskScore(BigDecimal v) { taskScore = v; }
        public BigDecimal getBlockScore() { return blockScore; }
        public void setBlockScore(BigDecimal v) { blockScore = v; }
        public BigDecimal getTimeAccuracyScore() { return timeAccuracyScore; }
        public void setTimeAccuracyScore(BigDecimal v) { timeAccuracyScore = v; }
        public BigDecimal getStreakBonus() { return streakBonus; }
        public void setStreakBonus(BigDecimal v) { streakBonus = v; }
        public int getStreakDays() { return streakDays; }
        public void setStreakDays(int v) { streakDays = v; }
        public String getLabel() { return label; }
        public void setLabel(String v) { label = v; }
        public int getTasksPlanned() { return tasksPlanned; }
        public void setTasksPlanned(int v) { tasksPlanned = v; }
        public int getTasksDone() { return tasksDone; }
        public void setTasksDone(int v) { tasksDone = v; }
        public int getBlocksPlanned() { return blocksPlanned; }
        public void setBlocksPlanned(int v) { blocksPlanned = v; }
        public int getBlocksDone() { return blocksDone; }
        public void setBlocksDone(int v) { blocksDone = v; }
        public double getAdherenceRate() { return adherenceRate; }
        public void setAdherenceRate(double v) { adherenceRate = v; }
    }

    public static class ScoreSeriesPoint {
        private LocalDate date;
        private BigDecimal score;
        private String label;

        public LocalDate getDate() { return date; }
        public void setDate(LocalDate v) { date = v; }
        public BigDecimal getScore() { return score; }
        public void setScore(BigDecimal v) { score = v; }
        public String getLabel() { return label; }
        public void setLabel(String v) { label = v; }
    }

    public static class ProductivityDashboardResponse {
        private FocusScoreResponse todayScore;
        private BigDecimal weekAvgScore, monthAvgScore;
        private int currentStreak;
        private double todayAdherence;
        private int pendingTasks, todayBlocksDone, todayBlocksTotal;
        private boolean timerRunning;
        private TimeEntryResponse activeTimer;

        public FocusScoreResponse getTodayScore() { return todayScore; }
        public void setTodayScore(FocusScoreResponse v) { todayScore = v; }
        public BigDecimal getWeekAvgScore() { return weekAvgScore; }
        public void setWeekAvgScore(BigDecimal v) { weekAvgScore = v; }
        public BigDecimal getMonthAvgScore() { return monthAvgScore; }
        public void setMonthAvgScore(BigDecimal v) { monthAvgScore = v; }
        public int getCurrentStreak() { return currentStreak; }
        public void setCurrentStreak(int v) { currentStreak = v; }
        public double getTodayAdherence() { return todayAdherence; }
        public void setTodayAdherence(double v) { todayAdherence = v; }
        public int getPendingTasks() { return pendingTasks; }
        public void setPendingTasks(int v) { pendingTasks = v; }
        public int getTodayBlocksDone() { return todayBlocksDone; }
        public void setTodayBlocksDone(int v) { todayBlocksDone = v; }
        public int getTodayBlocksTotal() { return todayBlocksTotal; }
        public void setTodayBlocksTotal(int v) { todayBlocksTotal = v; }
        public boolean isTimerRunning() { return timerRunning; }
        public void setTimerRunning(boolean v) { timerRunning = v; }
        public TimeEntryResponse getActiveTimer() { return activeTimer; }
        public void setActiveTimer(TimeEntryResponse v) { activeTimer = v; }
    }
}
