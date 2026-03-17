package com.omnihub.fitness.controller;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.fitness.entity.StepsLog;
import com.omnihub.fitness.entity.StepsTarget;
import com.omnihub.fitness.repository.StepsLogRepository;
import com.omnihub.fitness.repository.StepsTargetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/fitness/steps")
public class StepsController {

    @Autowired private StepsLogRepository stepsLogRepository;
    @Autowired private StepsTargetRepository stepsTargetRepository;
    @Autowired private UserRepository userRepository;

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ── Logs ────────────────────────────────────────────────────────────────

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getLogs(Authentication auth) {
        User user = getUser(auth);
        List<StepsLog> logs = stepsLogRepository.findByUserIdOrderByDateDesc(user.getId());
        List<StepsTarget> targets = stepsTargetRepository.findByUserIdOrderBySetDateDesc(user.getId());

        List<Map<String, Object>> result = new ArrayList<>();
        for (StepsLog log : logs) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", log.getId());
            row.put("date", log.getDate());
            row.put("steps", log.getSteps());
            row.put("stepsKm", log.getSteps() != null
                    ? Math.round(log.getSteps() * 0.00076 * 100.0) / 100.0 : null);
            row.put("stepsTime", log.getStepsTime());
            row.put("runKm", log.getRunKm());
            row.put("runTime", log.getRunTime());
            row.put("notes", log.getNotes());

            // Find active target for this log's date
            StepsTarget activeTarget = targets.stream()
                    .filter(t -> !t.getSetDate().isAfter(log.getDate()))
                    .findFirst()
                    .orElse(null);
            row.put("targetSteps", activeTarget != null ? activeTarget.getTargetSteps() : null);
            row.put("targetRunKm", activeTarget != null ? activeTarget.getTargetRunKm() : null);

            result.add(row);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/today")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getToday(Authentication auth) {
        User user = getUser(auth);
        LocalDate today = LocalDate.now();
        Map<String, Object> result = new LinkedHashMap<>();
        stepsLogRepository.findByUserIdAndDate(user.getId(), today).ifPresent(log -> {
            result.put("id", log.getId());
            result.put("steps", log.getSteps());
            result.put("runKm", log.getRunKm());
            result.put("stepsTime", log.getStepsTime());
            result.put("runTime", log.getRunTime());
        });
        stepsTargetRepository.findTopByUserIdOrderBySetDateDesc(user.getId()).ifPresent(t -> {
            result.put("targetSteps", t.getTargetSteps());
            result.put("targetRunKm", t.getTargetRunKm());
        });
        return ResponseEntity.ok(result);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<StepsLog> addLog(Authentication auth, @RequestBody StepsLogRequest req) {
        User user = getUser(auth);
        StepsLog log = stepsLogRepository.findByUserIdAndDate(user.getId(), req.getDate())
                .orElse(new StepsLog());
        log.setUser(user);
        log.setDate(req.getDate());
        log.setSteps(req.getSteps());
        log.setRunKm(req.getRunKm());
        log.setStepsTime(req.getStepsTime());
        log.setRunTime(req.getRunTime());
        log.setNotes(req.getNotes());
        return ResponseEntity.ok(stepsLogRepository.save(log));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<StepsLog> updateLog(Authentication auth, @PathVariable Long id,
                                               @RequestBody StepsLogRequest req) {
        User user = getUser(auth);
        StepsLog log = stepsLogRepository.findById(id)
                .filter(l -> l.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Log not found"));
        log.setSteps(req.getSteps());
        log.setRunKm(req.getRunKm());
        log.setStepsTime(req.getStepsTime());
        log.setRunTime(req.getRunTime());
        log.setNotes(req.getNotes());
        return ResponseEntity.ok(stepsLogRepository.save(log));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteLog(Authentication auth, @PathVariable Long id) {
        User user = getUser(auth);
        stepsLogRepository.findById(id)
                .filter(l -> l.getUser().getId().equals(user.getId()))
                .ifPresent(stepsLogRepository::delete);
        return ResponseEntity.noContent().build();
    }

    // ── Targets ─────────────────────────────────────────────────────────────

    @GetMapping("/targets")
    @Transactional(readOnly = true)
    public ResponseEntity<List<StepsTarget>> getTargets(Authentication auth) {
        User user = getUser(auth);
        return ResponseEntity.ok(stepsTargetRepository.findByUserIdOrderBySetDateDesc(user.getId()));
    }

    @PostMapping("/target")
    @Transactional
    public ResponseEntity<StepsTarget> addTarget(Authentication auth, @RequestBody StepsTargetRequest req) {
        User user = getUser(auth);
        StepsTarget target = new StepsTarget();
        target.setUser(user);
        target.setSetDate(req.getSetDate() != null ? req.getSetDate() : LocalDate.now());
        target.setTargetSteps(req.getTargetSteps());
        target.setTargetRunKm(req.getTargetRunKm());
        return ResponseEntity.ok(stepsTargetRepository.save(target));
    }

    @PutMapping("/target/{id}")
    @Transactional
    public ResponseEntity<StepsTarget> updateTarget(Authentication auth, @PathVariable Long id,
                                                     @RequestBody StepsTargetRequest req) {
        User user = getUser(auth);
        StepsTarget target = stepsTargetRepository.findById(id)
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Target not found"));
        target.setTargetSteps(req.getTargetSteps());
        target.setTargetRunKm(req.getTargetRunKm());
        return ResponseEntity.ok(stepsTargetRepository.save(target));
    }

    @DeleteMapping("/target/{id}")
    @Transactional
    public ResponseEntity<Void> deleteTarget(Authentication auth, @PathVariable Long id) {
        User user = getUser(auth);
        stepsTargetRepository.findById(id)
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .ifPresent(stepsTargetRepository::delete);
        return ResponseEntity.noContent().build();
    }

    // ── Request DTOs ─────────────────────────────────────────────────────────

    public static class StepsLogRequest {
        private LocalDate date;
        private Integer steps;
        private Double runKm;
        private String stepsTime;
        private String runTime;
        private String notes;

        public LocalDate getDate() { return date; }
        public void setDate(LocalDate date) { this.date = date; }
        public Integer getSteps() { return steps; }
        public void setSteps(Integer steps) { this.steps = steps; }
        public Double getRunKm() { return runKm; }
        public void setRunKm(Double runKm) { this.runKm = runKm; }
        public String getStepsTime() { return stepsTime; }
        public void setStepsTime(String stepsTime) { this.stepsTime = stepsTime; }
        public String getRunTime() { return runTime; }
        public void setRunTime(String runTime) { this.runTime = runTime; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }

    public static class StepsTargetRequest {
        private LocalDate setDate;
        private Integer targetSteps;
        private Double targetRunKm;

        public LocalDate getSetDate() { return setDate; }
        public void setSetDate(LocalDate setDate) { this.setDate = setDate; }
        public Integer getTargetSteps() { return targetSteps; }
        public void setTargetSteps(Integer targetSteps) { this.targetSteps = targetSteps; }
        public Double getTargetRunKm() { return targetRunKm; }
        public void setTargetRunKm(Double targetRunKm) { this.targetRunKm = targetRunKm; }
    }
}
