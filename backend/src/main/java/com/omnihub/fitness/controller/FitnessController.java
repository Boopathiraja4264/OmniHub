package com.omnihub.fitness.controller;

import com.omnihub.fitness.service.FitnessService;
import com.omnihub.core.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/fitness")
public class FitnessController {

    @Autowired private FitnessService fitnessService;
    @Autowired private JwtUtil jwtUtil;

    private String getEmail(String authHeader) {
        return jwtUtil.extractUsername(authHeader.substring(7));
    }

    // ── EXERCISES ──────────────────────────────────────────────────────────────
    @GetMapping("/exercises")
    public ResponseEntity<?> getExercises(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(fitnessService.getExercises(getEmail(auth)));
    }

    @PostMapping("/exercises")
    public ResponseEntity<?> saveExercise(@RequestHeader("Authorization") String auth,
                                          @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(fitnessService.saveExercise(getEmail(auth), body));
    }

    @DeleteMapping("/exercises/{id}")
    public ResponseEntity<?> deleteExercise(@RequestHeader("Authorization") String auth,
                                            @PathVariable Long id) {
        fitnessService.deleteExercise(getEmail(auth), id);
        return ResponseEntity.ok().build();
    }

    // ── WEEKLY PLAN ────────────────────────────────────────────────────────────
    @GetMapping("/weekly-plan")
    public ResponseEntity<?> getWeeklyPlan(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(fitnessService.getWeeklyPlan(getEmail(auth)));
    }

    @PostMapping("/weekly-plan")
    public ResponseEntity<?> saveWeeklyPlan(@RequestHeader("Authorization") String auth,
                                            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(fitnessService.saveWeeklyPlan(getEmail(auth), body));
    }

    @DeleteMapping("/weekly-plan/{id}")
    public ResponseEntity<?> deleteWeeklyPlan(@RequestHeader("Authorization") String auth,
                                              @PathVariable Long id) {
        fitnessService.deleteWeeklyPlan(getEmail(auth), id);
        return ResponseEntity.ok().build();
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
        return result != null ? ResponseEntity.ok(result) : ResponseEntity.notFound().build();
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

    // ── DASHBOARD ──────────────────────────────────────────────────────────────
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(@RequestHeader("Authorization") String auth) {
        return ResponseEntity.ok(fitnessService.getDashboard(getEmail(auth)));
    }
}
