package com.omnihub.productivity.controller;

import com.omnihub.productivity.dto.ProductivityDTOs.*;
import com.omnihub.productivity.service.DailyPlanService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/productivity")
public class DailyPlanController {

    @Autowired private DailyPlanService planService;

    // Get plan for date (auto-creates blank plan)
    @GetMapping("/plans")
    public ResponseEntity<DailyPlanResponse> getOrCreate(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(planService.getOrCreate(user.getUsername(), date));
    }

    @GetMapping("/plans/range")
    public ResponseEntity<List<DailyPlanResponse>> getRange(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(planService.getRange(user.getUsername(), from, to));
    }

    @PostMapping("/plans")
    public ResponseEntity<DailyPlanResponse> create(@AuthenticationPrincipal UserDetails user,
                                                    @Valid @RequestBody DailyPlanRequest req) {
        return ResponseEntity.ok(planService.create(user.getUsername(), req));
    }

    @PutMapping("/plans/{id}")
    public ResponseEntity<DailyPlanResponse> update(@AuthenticationPrincipal UserDetails user,
                                                    @PathVariable Long id,
                                                    @RequestBody DailyPlanUpdateRequest req) {
        return ResponseEntity.ok(planService.update(user.getUsername(), id, req));
    }

    @PostMapping("/plans/{id}/generate")
    public ResponseEntity<DailyPlanResponse> generateFromTemplate(@AuthenticationPrincipal UserDetails user,
                                                                   @PathVariable Long id) {
        return ResponseEntity.ok(planService.generateFromTemplate(user.getUsername(), id));
    }

    @PostMapping("/plans/{id}/defer-incomplete")
    public ResponseEntity<Void> deferIncomplete(@AuthenticationPrincipal UserDetails user,
                                                @PathVariable Long id) {
        planService.deferIncomplete(user.getUsername(), id);
        return ResponseEntity.ok().build();
    }

    // ─── Time Blocks ─────────────────────────────────────────────────────────

    @PostMapping("/plans/{planId}/blocks")
    public ResponseEntity<TimeBlockResponse> addBlock(@AuthenticationPrincipal UserDetails user,
                                                      @PathVariable Long planId,
                                                      @Valid @RequestBody TimeBlockRequest req) {
        return ResponseEntity.ok(planService.addBlock(user.getUsername(), planId, req));
    }

    @PutMapping("/time-blocks/{id}")
    public ResponseEntity<TimeBlockResponse> updateBlock(@AuthenticationPrincipal UserDetails user,
                                                         @PathVariable Long id,
                                                         @Valid @RequestBody TimeBlockRequest req) {
        return ResponseEntity.ok(planService.updateBlock(user.getUsername(), id, req));
    }

    @PatchMapping("/time-blocks/{id}/status")
    public ResponseEntity<TimeBlockResponse> updateBlockStatus(@AuthenticationPrincipal UserDetails user,
                                                               @PathVariable Long id,
                                                               @RequestBody BlockStatusRequest req) {
        return ResponseEntity.ok(planService.updateBlockStatus(user.getUsername(), id, req));
    }

    @DeleteMapping("/time-blocks/{id}")
    public ResponseEntity<Void> deleteBlock(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        planService.deleteBlock(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
