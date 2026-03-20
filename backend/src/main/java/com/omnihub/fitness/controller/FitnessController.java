package com.omnihub.fitness.controller;

import com.omnihub.fitness.service.FitnessService;
import com.omnihub.core.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/fitness")
public class FitnessController {

    @Autowired
    private FitnessService fitnessService;
    @Autowired
    private JwtUtil jwtUtil;

    @Value("${exercise.api-key:}")
    private String exerciseApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    private String getEmail(String authHeader) {
        return jwtUtil.extractUsername(authHeader.substring(7));
    }

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
    public ResponseEntity<?> getWeeklyPlan(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(fitnessService.getWeeklyPlan(getEmail(auth)));
    }

    @PostMapping("/weekly-plan")
    public ResponseEntity<?> saveWeeklyPlan(@RequestHeader("Authorization") String auth,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(fitnessService.saveWeeklyPlan(getEmail(auth), body));
    }

    @DeleteMapping("/weekly-plan/{id}")
    public ResponseEntity<?> deleteWeeklyPlan(@RequestHeader("Authorization") String auth,
            @PathVariable Long id) {
        fitnessService.deleteWeeklyPlan(getEmail(auth), id);
        return ResponseEntity.ok().build();
    }

    // achivable weight goal weeks
    @GetMapping("/weight/achieved-weeks")
    public ResponseEntity<?> getAchievedWeeks(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(fitnessService.getAchievedWeeks(getEmail(auth)));
    }

    @PostMapping("/weight/achieved-weeks")
    public ResponseEntity<?> saveAchievedWeeks(@RequestHeader("Authorization") String auth,
            @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Integer> weeks = (List<Integer>) body.get("achievedWeeks");
        return ResponseEntity.ok(fitnessService.saveAchievedWeeks(getEmail(auth), weeks));
    }

    // ── WORKOUTS ───────────────────────────────────────────────────────────────
    @GetMapping("/workouts")
    public ResponseEntity<?> getWorkouts(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(fitnessService.getWorkouts(getEmail(auth)));
    }

    @GetMapping("/workouts/date/{date}")
    public ResponseEntity<?> getWorkoutByDate(@RequestHeader("Authorization") String auth,
            @PathVariable String date) {
        Object result = fitnessService.getWorkoutByDate(getEmail(auth), LocalDate.parse(date));
        return ResponseEntity.ok(result != null ? result : Collections.emptyMap());
    }

    @PostMapping("/workouts")
    public ResponseEntity<?> saveWorkout(@RequestHeader("Authorization") String auth,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(fitnessService.saveWorkout(getEmail(auth), body));
    }

    // ── WEIGHT ─────────────────────────────────────────────────────────────────
    @GetMapping("/weight")
    public ResponseEntity<?> getWeights(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(fitnessService.getWeights(getEmail(auth)));
    }

    @PostMapping("/weight")
    public ResponseEntity<?> saveWeight(@RequestHeader("Authorization") String auth,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(fitnessService.saveWeight(getEmail(auth), body));
    }

    @DeleteMapping("/weight/{id}")
    public ResponseEntity<?> deleteWeight(@RequestHeader("Authorization") String auth,
            @PathVariable Long id) {
        fitnessService.deleteWeight(getEmail(auth), id);
        return ResponseEntity.ok().build();
    }

    // ── WEIGHT SETUP ───────────────────────────────────────────────────────────
    @GetMapping("/weight/setup")
    public ResponseEntity<?> getWeightSetup(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(fitnessService.getWeightSetup(getEmail(auth)));
    }

    @PostMapping("/weight/setup")
    public ResponseEntity<?> saveWeightSetup(@RequestHeader("Authorization") String auth,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(fitnessService.saveWeightSetup(getEmail(auth), body));
    }

    // ── WEIGHT STATS ───────────────────────────────────────────────────────────
    @GetMapping("/weight/stats")
    public ResponseEntity<?> getWeightStats(@RequestHeader("Authorization") String auth,
            @RequestParam String month) {
        return ResponseEntity.ok(fitnessService.getWeightStats(getEmail(auth), month));
    }

    // ── DASHBOARD ──────────────────────────────────────────────────────────────
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(fitnessService.getDashboard(getEmail(auth)));
    }
}
