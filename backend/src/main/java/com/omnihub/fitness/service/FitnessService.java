package com.omnihub.fitness.service;

import com.omnihub.fitness.entity.*;
import com.omnihub.fitness.repository.*;
import com.omnihub.core.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;

@Service
public class FitnessService {

    @Autowired
    private WeightGoalWeekRepository weightGoalWeekRepository;
    @Autowired
    private ExerciseRepository exerciseRepository;
    @Autowired
    private WeeklyPlanRepository weeklyPlanRepository;
    @Autowired
    private WorkoutLogRepository workoutLogRepository;
    @Autowired
    private WeightLogRepository weightLogRepository;
    @Autowired
    private com.omnihub.core.repository.UserRepository userRepository;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ── WEEKLY PLAN ────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getWeeklyPlan(String email) {
        User user = getUser(email);
        List<Map<String, Object>> result = new ArrayList<>();
        for (WeeklyPlan p : weeklyPlanRepository.findByUserId(user.getId())) {
            result.add(weeklyPlanToMap(p));
        }
        return result;
    }

    private Map<String, Object> weeklyPlanToMap(WeeklyPlan p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("dayOfWeek", p.getDayOfWeek());
        m.put("planDescription", p.getPlanDescription());
        List<Map<String, Object>> exList = new ArrayList<>();
        for (WeeklyPlanExercise wpe : p.getExercises()) {
            Map<String, Object> ex = new LinkedHashMap<>();
            ex.put("id", wpe.getId());
            ex.put("exerciseName", wpe.getExerciseName());
            ex.put("muscleGroup", wpe.getMuscleGroup());
            ex.put("plannedSets", wpe.getPlannedSets());
            ex.put("plannedReps", wpe.getPlannedReps());
            ex.put("sortOrder", wpe.getSortOrder());
            exList.add(ex);
        }
        m.put("exercises", exList);
        return m;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> saveWeeklyPlan(String email, Map<String, Object> req) {
        User user = getUser(email);
        String day = (String) req.get("dayOfWeek");
        WeeklyPlan p = weeklyPlanRepository.findByUserIdAndDayOfWeek(user.getId(), day)
                .orElse(new WeeklyPlan());
        p.setDayOfWeek(day);
        p.setPlanDescription((String) req.get("planDescription"));
        p.setUser(user);

        p.getExercises().clear();
        List<Map<String, Object>> exercises = (List<Map<String, Object>>) req.getOrDefault("exercises", List.of());
        int order = 0;
        for (Map<String, Object> exReq : exercises) {
            String exerciseName = (String) exReq.get("exerciseName");
            if (exerciseName == null || exerciseName.isBlank()) continue;
            WeeklyPlanExercise wpe = new WeeklyPlanExercise();
            wpe.setWeeklyPlan(p);
            wpe.setExerciseName(exerciseName);
            wpe.setMuscleGroup((String) exReq.get("muscleGroup"));
            wpe.setPlannedSets(exReq.get("plannedSets") != null
                    ? Integer.valueOf(exReq.get("plannedSets").toString()) : null);
            wpe.setPlannedReps(exReq.get("plannedReps") != null
                    ? exReq.get("plannedReps").toString() : null);
            wpe.setSortOrder(order++);
            p.getExercises().add(wpe);
        }

        weeklyPlanRepository.save(p);
        return weeklyPlanToMap(p);
    }

    @Transactional
    public void deleteWeeklyPlan(String email, Long id) {
        WeeklyPlan p = weeklyPlanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found"));
        weeklyPlanRepository.delete(p);
    }

    // ── WORKOUT LOGS ───────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> saveWorkout(String email, Map<String, Object> req) {
        User user = getUser(email);
        Object dateVal = req.get("date");
        if (dateVal == null || dateVal.toString().trim().isEmpty()) {
            throw new RuntimeException("Date is required");
        }
        LocalDate date;
        try {
            date = LocalDate.parse(dateVal.toString().trim());
        } catch (Exception e) {
            throw new RuntimeException("Invalid date format: " + dateVal);
        }

        WorkoutLog log = workoutLogRepository.findByUserIdAndDate(user.getId(), date)
                .orElse(new WorkoutLog());
        log.setDate(date);
        log.setNotes(req.get("notes") != null ? req.get("notes").toString() : "");
        log.setUser(user);

        if (log.getSets() == null) {
            log.setSets(new ArrayList<>());
        } else {
            log.getSets().clear();
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> setsData = (List<Map<String, Object>>) req.get("sets");
        if (setsData != null) {
            for (Map<String, Object> sd : setsData) {
                if (sd == null)
                    continue;

                ExerciseSet set = new ExerciseSet();
                Object exIdObj = sd.get("exerciseId");
                Object exNameObj = sd.get("exerciseName");
                if (exIdObj != null && !exIdObj.toString().trim().isEmpty()) {
                    try {
                        Long exId = Long.valueOf(exIdObj.toString().trim().split("\\.")[0]);
                        Exercise ex = exerciseRepository.findById(exId)
                                .orElseThrow(() -> new RuntimeException("Exercise not found with id: " + exId));
                        set.setExercise(ex);
                        set.setExerciseName(ex.getName());
                    } catch (Exception e) {
                        continue;
                    }
                } else if (exNameObj != null && !exNameObj.toString().trim().isEmpty()) {
                    set.setExerciseName(exNameObj.toString().trim());
                } else {
                    continue;
                }

                Object sVal = sd.get("sets") != null ? sd.get("sets") : sd.get("setNumber");
                if (sVal != null && !sVal.toString().trim().isEmpty()) {
                    try {
                        set.setSets(Integer.valueOf(sVal.toString().trim().split("\\.")[0]));
                    } catch (Exception e) {
                        set.setSets(1);
                    }
                } else {
                    set.setSets(1);
                }

                Object rVal = sd.get("reps");
                set.setReps(rVal != null && !rVal.toString().trim().isEmpty()
                        ? rVal.toString().trim() : null);

                Object wVal = sd.get("weight");
                if (wVal != null && !wVal.toString().trim().isEmpty()) {
                    try {
                        set.setWeight(Double.valueOf(wVal.toString().trim()));
                    } catch (Exception e) {
                        set.setWeight(null);
                    }
                } else {
                    set.setWeight(null);
                }

                set.setNotes(sd.get("notes") != null ? sd.get("notes").toString() : "");
                set.setWorkoutLog(log);
                log.getSets().add(set);
            }
        }
        workoutLogRepository.save(log);
        return toWorkoutMap(log);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getWorkouts(String email) {
        User user = getUser(email);
        List<Map<String, Object>> result = new ArrayList<>();
        for (WorkoutLog log : workoutLogRepository.findByUserIdOrderByDateDesc(user.getId())) {
            result.add(toWorkoutMap(log));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getWorkoutByDate(String email, LocalDate date) {
        User user = getUser(email);
        return workoutLogRepository.findByUserIdAndDate(user.getId(), date)
                .map(this::toWorkoutMap).orElse(null);
    }

    private Map<String, Object> toWorkoutMap(WorkoutLog log) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", log.getId());
        m.put("date", log.getDate().toString());
        m.put("notes", log.getNotes());
        List<Map<String, Object>> sets = new ArrayList<>();
        for (ExerciseSet s : log.getSets()) {
            Map<String, Object> sm = new LinkedHashMap<>();
            sm.put("id", s.getId());
            sm.put("exerciseId", s.getExercise() != null ? s.getExercise().getId() : null);
            sm.put("exerciseName", s.getExerciseName() != null && !s.getExerciseName().isEmpty()
                    ? s.getExerciseName()
                    : (s.getExercise() != null ? s.getExercise().getName() : ""));
            sm.put("sets", s.getSets());
            sm.put("reps", s.getReps());
            sm.put("weight", s.getWeight());
            sm.put("notes", s.getNotes());
            sets.add(sm);
        }
        m.put("sets", sets);
        return m;
    }

    // ── WEIGHT LOGS ────────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> saveWeight(String email, Map<String, Object> req) {
        User user = getUser(email);
        Object dateVal = req.get("date");
        if (dateVal == null || dateVal.toString().trim().isEmpty()) {
            throw new RuntimeException("Date is required");
        }
        LocalDate date = LocalDate.parse(dateVal.toString().trim());

        WeightLog log = weightLogRepository.findByUserIdAndDate(user.getId(), date)
                .orElse(new WeightLog());
        log.setDate(date);

        Object wVal = req.get("weight");
        if (wVal == null || wVal.toString().trim().isEmpty()) {
            throw new RuntimeException("Weight value is required");
        }
        log.setWeight(Double.valueOf(wVal.toString().trim()));
        log.setNotes(req.get("notes") != null ? req.get("notes").toString() : "");
        log.setUser(user);
        weightLogRepository.save(log);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", log.getId());
        m.put("date", log.getDate().toString());
        m.put("weight", log.getWeight());
        m.put("notes", log.getNotes());
        return m;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getWeights(String email) {
        User user = getUser(email);
        List<Map<String, Object>> result = new ArrayList<>();
        for (WeightLog log : weightLogRepository.findByUserIdOrderByDateDesc(user.getId())) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", log.getId());
            m.put("date", log.getDate().toString());
            m.put("weight", log.getWeight());
            m.put("notes", log.getNotes());
            result.add(m);
        }
        return result;
    }

    @Transactional
    public void deleteWeight(String email, Long id) {
        WeightLog log = weightLogRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Weight log not found"));
        weightLogRepository.delete(log);
    }

    // ── WEIGHT SETUP ───────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> saveWeightSetup(String email, Map<String, Object> req) {
        User user = getUser(email);
        if (req.get("heightCm") != null && !req.get("heightCm").toString().equals("NaN"))
            user.setHeightCm(Double.valueOf(req.get("heightCm").toString()));
        if (req.get("goalWeight") != null && !req.get("goalWeight").toString().equals("NaN"))
            user.setGoalWeight(Double.valueOf(req.get("goalWeight").toString()));
        if (req.get("weeklyLossRate") != null && !req.get("weeklyLossRate").toString().equals("NaN"))
            user.setWeeklyLossRate(Double.valueOf(req.get("weeklyLossRate").toString()));
        if (req.get("startWeight") != null && !req.get("startWeight").toString().equals("NaN"))
            user.setStartWeight(Double.valueOf(req.get("startWeight").toString()));
        if (req.get("scheduleStartDate") != null && !req.get("scheduleStartDate").toString().isEmpty())
            user.setScheduleStartDate(req.get("scheduleStartDate").toString());
        if (req.get("scheduleStartWeight") != null && !req.get("scheduleStartWeight").toString().equals("NaN"))
            user.setScheduleStartWeight(Double.valueOf(req.get("scheduleStartWeight").toString()));
        userRepository.save(user);
        return getWeightSetup(email);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getWeightSetup(String email) {
        User user = getUser(email);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("heightCm", user.getHeightCm());
        m.put("goalWeight", user.getGoalWeight());
        m.put("weeklyLossRate", user.getWeeklyLossRate());
        m.put("startWeight", user.getStartWeight());
        m.put("scheduleStartDate", user.getScheduleStartDate());
        m.put("scheduleStartWeight", user.getScheduleStartWeight());
        return m;
    }

    // ── ACHIEVED WEEKS ─────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> getAchievedWeeks(String email) {
        User user = getUser(email);
        List<Integer> weeks = new ArrayList<>();
        for (WeightGoalWeek w : weightGoalWeekRepository.findByUserId(user.getId())) {
            if (w.getAchieved())
                weeks.add(w.getWeekNumber());
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("achievedWeeks", weeks);
        return m;
    }

    @Transactional
    public Map<String, Object> saveAchievedWeeks(String email, List<Integer> weekNumbers) {
        User user = getUser(email);
        for (Integer weekNum : weekNumbers) {
            WeightGoalWeek w = weightGoalWeekRepository
                    .findByUserIdAndWeekNumber(user.getId(), weekNum)
                    .orElse(new WeightGoalWeek());
            w.setWeekNumber(weekNum);
            w.setAchieved(true);
            w.setUser(user);
            weightGoalWeekRepository.save(w);
        }
        for (WeightGoalWeek w : weightGoalWeekRepository.findByUserId(user.getId())) {
            if (!weekNumbers.contains(w.getWeekNumber())) {
                w.setAchieved(false);
                weightGoalWeekRepository.save(w);
            }
        }
        return getAchievedWeeks(email);
    }

    // ── WEIGHT STATS ───────────────────────────────────────────────────────────
    // Returns only raw DB rows for the month + latest/first weight.
    // All calculations (BMI, targets, change direction, etc.) are done client-side.
    @Transactional(readOnly = true)
    public Map<String, Object> getWeightStats(String email, String monthStr) {
        User user = getUser(email);

        java.time.YearMonth ym = java.time.YearMonth.parse(monthStr);
        LocalDate firstDay = ym.atDay(1);
        LocalDate lastDay = ym.atEndOfMonth();

        List<WeightLog> logs = weightLogRepository
                .findByUserIdAndDateBetweenOrderByDate(user.getId(), firstDay, lastDay);

        Map<LocalDate, Double> logMap = new LinkedHashMap<>();
        for (WeightLog l : logs)
            logMap.put(l.getDate(), l.getWeight());

        // Build days list — raw date + weight only
        List<Map<String, Object>> days = new ArrayList<>();
        for (int d = 1; d <= lastDay.getDayOfMonth(); d++) {
            LocalDate date = firstDay.withDayOfMonth(d);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", date.toString());
            row.put("weight", logMap.getOrDefault(date, null));
            days.add(row);
        }

        // Two limit-1 queries instead of fetching all logs
        Double latestWeight = weightLogRepository
                .findTopByUserIdOrderByDateDesc(user.getId())
                .map(WeightLog::getWeight).orElse(null);
        Double firstWeight = weightLogRepository
                .findTopByUserIdOrderByDateAsc(user.getId())
                .map(WeightLog::getWeight).orElse(null);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("days", days);
        result.put("latestWeight", latestWeight);
        result.put("firstWeight", firstWeight);
        return result;
    }

    // ── DASHBOARD ──────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboard(String email) {
        User user = getUser(email);
        Map<String, Object> dash = new LinkedHashMap<>();

        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);

        // Two COUNT queries — no rows loaded into memory
        dash.put("totalWorkouts", workoutLogRepository.countByUserId(user.getId()));
        dash.put("workoutsThisWeek", workoutLogRepository.countByUserIdAndDateBetween(user.getId(), weekStart, today));

        weightLogRepository.findTopByUserIdOrderByDateDesc(user.getId()).ifPresent(w -> {
            dash.put("latestWeight", w.getWeight());
            dash.put("latestWeightDate", w.getDate().toString());
        });

        dash.put("todayPlan", weeklyPlanRepository
                .findByUserIdAndDayOfWeek(user.getId(), today.getDayOfWeek().name())
                .map(WeeklyPlan::getPlanDescription).orElse("Rest day"));

        return dash;
    }
}