package com.omnihub.fitness.controller;

import com.omnihub.fitness.service.FitnessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/fitness")
public class FitnessController {

    @Autowired
    private FitnessService fitnessService;

    @Value("${exercise.api-key:}")
    private String exerciseApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    // ── EXERCISES ──────────────────────────────────────────────────────────────

    // Search exercises from API Ninjas — proxied to keep API key secret
    @GetMapping("/exercises/search")
    public ResponseEntity<?> searchExercises(
            @RequestParam(required = false) String muscle,
            @RequestParam(required = false) String name) {
        if (exerciseApiKey == null || exerciseApiKey.isBlank()) {
            return ResponseEntity.status(503).body("Exercise API key not configured");
        }
        try {
            StringBuilder url = new StringBuilder("https://api.api-ninjas.com/v1/exercises?limit=15");
            if (muscle != null && !muscle.isBlank()) url.append("&muscle=").append(java.net.URLEncoder.encode(muscle.toLowerCase().replace(" ", "_"), java.nio.charset.StandardCharsets.UTF_8));
            if (name   != null && !name.isBlank())   url.append("&name=").append(java.net.URLEncoder.encode(name.trim(), java.nio.charset.StandardCharsets.UTF_8));

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Api-Key", exerciseApiKey);
            HttpEntity<Void> req = new HttpEntity<>(headers);

            ResponseEntity<Object[]> resp = restTemplate.exchange(url.toString(), HttpMethod.GET, req, Object[].class);
            return ResponseEntity.ok(resp.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(502).body("Failed to fetch exercises: " + e.getMessage());
        }
    }

    // ── WEEKLY PLAN ────────────────────────────────────────────────────────────
    @GetMapping("/weekly-plan")
    public ResponseEntity<?> getWeeklyPlan(Authentication auth) {
        return ResponseEntity.ok(fitnessService.getWeeklyPlan(auth.getName()));
    }

    @PostMapping("/weekly-plan")
    public ResponseEntity<?> saveWeeklyPlan(Authentication auth,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(fitnessService.saveWeeklyPlan(auth.getName(), body));
    }

    @DeleteMapping("/weekly-plan/{id}")
    public ResponseEntity<?> deleteWeeklyPlan(Authentication auth,
            @PathVariable Long id) {
        fitnessService.deleteWeeklyPlan(auth.getName(), id);
        return ResponseEntity.ok().build();
    }

    // achivable weight goal weeks
    @GetMapping("/weight/achieved-weeks")
    public ResponseEntity<?> getAchievedWeeks(Authentication auth) {
        return ResponseEntity.ok(fitnessService.getAchievedWeeks(auth.getName()));
    }

    @PostMapping("/weight/achieved-weeks")
    public ResponseEntity<?> saveAchievedWeeks(Authentication auth,
            @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Integer> weeks = (List<Integer>) body.get("achievedWeeks");
        return ResponseEntity.ok(fitnessService.saveAchievedWeeks(auth.getName(), weeks));
    }

    // ── WORKOUTS ───────────────────────────────────────────────────────────────
    @GetMapping("/workouts")
    public ResponseEntity<?> getWorkouts(Authentication auth) {
        return ResponseEntity.ok(fitnessService.getWorkouts(auth.getName()));
    }

    @GetMapping("/workouts/date/{date}")
    public ResponseEntity<?> getWorkoutByDate(Authentication auth,
            @PathVariable String date) {
        Object result = fitnessService.getWorkoutByDate(auth.getName(), LocalDate.parse(date));
        return ResponseEntity.ok(result != null ? result : Collections.emptyMap());
    }

    @PostMapping("/workouts")
    public ResponseEntity<?> saveWorkout(Authentication auth,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(fitnessService.saveWorkout(auth.getName(), body));
    }

    // ── WEIGHT ─────────────────────────────────────────────────────────────────
    @GetMapping("/weight")
    public ResponseEntity<?> getWeights(Authentication auth) {
        return ResponseEntity.ok(fitnessService.getWeights(auth.getName()));
    }

    @PostMapping("/weight")
    public ResponseEntity<?> saveWeight(Authentication auth,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(fitnessService.saveWeight(auth.getName(), body));
    }

    @DeleteMapping("/weight/{id}")
    public ResponseEntity<?> deleteWeight(Authentication auth,
            @PathVariable Long id) {
        fitnessService.deleteWeight(auth.getName(), id);
        return ResponseEntity.ok().build();
    }

    // ── WEIGHT SETUP ───────────────────────────────────────────────────────────
    @GetMapping("/weight/setup")
    public ResponseEntity<?> getWeightSetup(Authentication auth) {
        return ResponseEntity.ok(fitnessService.getWeightSetup(auth.getName()));
    }

    @PostMapping("/weight/setup")
    public ResponseEntity<?> saveWeightSetup(Authentication auth,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(fitnessService.saveWeightSetup(auth.getName(), body));
    }

    // ── WEIGHT STATS ───────────────────────────────────────────────────────────
    @GetMapping("/weight/stats")
    public ResponseEntity<?> getWeightStats(Authentication auth,
            @RequestParam String month) {
        return ResponseEntity.ok(fitnessService.getWeightStats(auth.getName(), month));
    }

    // ── DASHBOARD ──────────────────────────────────────────────────────────────
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(Authentication auth) {
        return ResponseEntity.ok(fitnessService.getDashboard(auth.getName()));
    }
}
