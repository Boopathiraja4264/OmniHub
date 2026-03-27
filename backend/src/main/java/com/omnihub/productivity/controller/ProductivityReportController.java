package com.omnihub.productivity.controller;

import com.omnihub.productivity.dto.ProductivityDTOs.*;
import com.omnihub.productivity.service.ProductivityReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/productivity/reports")
public class ProductivityReportController {

    @Autowired private ProductivityReportService reportService;

    @GetMapping("/dashboard")
    public ResponseEntity<ProductivityDashboardResponse> getDashboard(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(reportService.getDashboard(user.getUsername()));
    }

    @GetMapping("/daily")
    public ResponseEntity<DailyReportResponse> getDaily(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(reportService.getDailyReport(user.getUsername(), date));
    }

    @GetMapping("/adherence")
    public ResponseEntity<List<AdherenceDataPoint>> getAdherence(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(reportService.getAdherence(user.getUsername(), from, to));
    }

    @GetMapping("/focus-score")
    public ResponseEntity<FocusScoreResponse> getFocusScore(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(reportService.computeFocusScore(user.getUsername(), date));
    }

    @PostMapping("/focus-score/compute")
    public ResponseEntity<FocusScoreResponse> recompute(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(reportService.computeFocusScore(user.getUsername(), date));
    }

    @GetMapping("/focus-score/series/daily")
    public ResponseEntity<List<ScoreSeriesPoint>> getDailySeries(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(reportService.getDailyScoreSeries(user.getUsername(), from, to));
    }

    @GetMapping("/focus-score/series/weekly")
    public ResponseEntity<List<ScoreSeriesPoint>> getWeeklySeries(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam int year) {
        return ResponseEntity.ok(reportService.getWeeklyScoreSeries(user.getUsername(), year));
    }

    @GetMapping("/focus-score/series/monthly")
    public ResponseEntity<List<ScoreSeriesPoint>> getMonthlySeries(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam int year) {
        return ResponseEntity.ok(reportService.getMonthlyScoreSeries(user.getUsername(), year));
    }
}
