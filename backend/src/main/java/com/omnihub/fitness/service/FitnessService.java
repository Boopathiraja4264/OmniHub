package com.omnihub.fitness.service;

import com.omnihub.fitness.entity.*;
import com.omnihub.fitness.repository.*;
import com.omnihub.core.entity.User;
import com.omnihub.core.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.*;

@Service
public class FitnessService {

    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private WeeklyPlanRepository weeklyPlanRepository;
    @Autowired private WorkoutLogRepository workoutLogRepository;
    @Autowired private WeightLogRepository weightLogRepository;
    @Autowired private com.omnihub.core.repository.UserRepository userRepository;
    @Autowired private JwtUtil jwtUtil;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ── EXERCISES ──────────────────────────────────────────────────────────────
    public List<Map<String, Object>> getExercises(String email) {
        User user = getUser(email);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Exercise e : exerciseRepository.findByUserId(user.getId())) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", e.getId());
            m.put("name", e.getName());
            m.put("muscleGroup", e.getMuscleGroup());
            m.put("description", e.getDescription());
            result.add(m);
        }
        return result;
    }

    public Map<String, Object> saveExercise(String email, Map<String, String> req) {
        User user = getUser(email);
        Exercise e = new Exercise();
        e.setName(req.get("name"));
        e.setMuscleGroup(req.get("muscleGroup"));
        e.setDescription(req.get("description"));
        e.setUser(user);
        exerciseRepository.save(e);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("name", e.getName());
        m.put("muscleGroup", e.getMuscleGroup());
        m.put("description", e.getDescription());
        return m;
    }

    public void deleteExercise(String email, Long id) {
        Exercise e = exerciseRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Not found"));
        exerciseRepository.delete(e);
    }

    // ── WEEKLY PLAN ────────────────────────────────────────────────────────────
    public List<Map<String, Object>> getWeeklyPlan(String email) {
        User user = getUser(email);
        List<Map<String, Object>> result = new ArrayList<>();
        for (WeeklyPlan p : weeklyPlanRepository.findByUserId(user.getId())) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("dayOfWeek", p.getDayOfWeek());
            m.put("planDescription", p.getPlanDescription());
            result.add(m);
        }
        return result;
    }

    public Map<String, Object> saveWeeklyPlan(String email, Map<String, String> req) {
        User user = getUser(email);
        String day = req.get("dayOfWeek");
        WeeklyPlan p = weeklyPlanRepository.findByUserIdAndDayOfWeek(user.getId(), day)
            .orElse(new WeeklyPlan());
        p.setDayOfWeek(day);
        p.setPlanDescription(req.get("planDescription"));
        p.setUser(user);
        weeklyPlanRepository.save(p);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("dayOfWeek", p.getDayOfWeek());
        m.put("planDescription", p.getPlanDescription());
        return m;
    }

    // ── WORKOUT LOGS ───────────────────────────────────────────────────────────
    public Map<String, Object> saveWorkout(String email, Map<String, Object> req) {
        User user = getUser(email);
        LocalDate date = LocalDate.parse((String) req.get("date"));
        WorkoutLog log = workoutLogRepository.findByUserIdAndDate(user.getId(), date)
            .orElse(new WorkoutLog());
        log.setDate(date);
        log.setNotes((String) req.getOrDefault("notes", ""));
        log.setUser(user);
        log.getSets().clear();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> setsData = (List<Map<String, Object>>) req.get("sets");
        if (setsData != null) {
            for (Map<String, Object> sd : setsData) {
                ExerciseSet set = new ExerciseSet();
                Long exId = Long.valueOf(sd.get("exerciseId").toString());
                Exercise ex = exerciseRepository.findById(exId)
                    .orElseThrow(() -> new RuntimeException("Exercise not found"));
                set.setExercise(ex);
                set.setSets(Integer.valueOf(sd.getOrDefault("sets", sd.getOrDefault("setNumber", "1")).toString()));
                set.setReps(Integer.valueOf(sd.get("reps").toString()));
                set.setWeight(Double.valueOf(sd.get("weight").toString()));
                set.setNotes((String) sd.getOrDefault("notes", ""));
                set.setWorkoutLog(log);
                log.getSets().add(set);
            }
        }
        workoutLogRepository.save(log);
        return toWorkoutMap(log);
    }

    public List<Map<String, Object>> getWorkouts(String email) {
        User user = getUser(email);
        List<Map<String, Object>> result = new ArrayList<>();
        for (WorkoutLog log : workoutLogRepository.findByUserIdOrderByDateDesc(user.getId())) {
            result.add(toWorkoutMap(log));
        }
        return result;
    }

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
            sm.put("exerciseName", s.getExercise() != null ? s.getExercise().getName() : "");
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
    public Map<String, Object> saveWeight(String email, Map<String, Object> req) {
        User user = getUser(email);
        LocalDate date = LocalDate.parse((String) req.get("date"));
        WeightLog log = weightLogRepository.findByUserIdAndDate(user.getId(), date)
            .orElse(new WeightLog());
        log.setDate(date);
        log.setWeight(Double.valueOf(req.get("weight").toString()));
        log.setNotes((String) req.getOrDefault("notes", ""));
        log.setUser(user);
        weightLogRepository.save(log);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", log.getId());
        m.put("date", log.getDate().toString());
        m.put("weight", log.getWeight());
        m.put("notes", log.getNotes());
        return m;
    }

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

    // ── DASHBOARD ──────────────────────────────────────────────────────────────
    public Map<String, Object> getDashboard(String email) {
        User user = getUser(email);
        Map<String, Object> dash = new LinkedHashMap<>();

        List<WorkoutLog> logs = workoutLogRepository.findByUserIdOrderByDateDesc(user.getId());
        dash.put("totalWorkouts", logs.size());

        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);
        long weekCount = logs.stream()
            .filter(l -> !l.getDate().isBefore(weekStart) && !l.getDate().isAfter(today))
            .count();
        dash.put("workoutsThisWeek", weekCount);

        weightLogRepository.findByUserIdOrderByDateDesc(user.getId())
            .stream().findFirst().ifPresent(w -> {
                dash.put("latestWeight", w.getWeight());
                dash.put("latestWeightDate", w.getDate().toString());
            });

        dash.put("todayPlan", weeklyPlanRepository
            .findByUserIdAndDayOfWeek(user.getId(), today.getDayOfWeek().name())
            .map(WeeklyPlan::getPlanDescription).orElse("Rest day"));

        return dash;
    }
}
