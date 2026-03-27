package com.omnihub.productivity.controller;

import com.omnihub.productivity.dto.ProductivityDTOs.*;
import com.omnihub.productivity.service.TimeTrackerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/productivity/timer")
public class TimeTrackerController {

    @Autowired private TimeTrackerService trackerService;

    @GetMapping("/active")
    public ResponseEntity<TimeEntryResponse> getActive(@AuthenticationPrincipal UserDetails user) {
        return trackerService.getActive(user.getUsername())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/start")
    public ResponseEntity<TimeEntryResponse> start(@AuthenticationPrincipal UserDetails user,
                                                   @RequestBody(required = false) StartTimerRequest req) {
        return ResponseEntity.ok(trackerService.start(user.getUsername(), req != null ? req : new StartTimerRequest()));
    }

    @PostMapping("/stop")
    public ResponseEntity<TimeEntryResponse> stop(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(trackerService.stop(user.getUsername()));
    }

    @GetMapping("/entries")
    public ResponseEntity<List<TimeEntryResponse>> getEntries(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(trackerService.getForDate(user.getUsername(), date));
    }

    @DeleteMapping("/entries/{id}")
    public ResponseEntity<Void> deleteEntry(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        trackerService.delete(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
