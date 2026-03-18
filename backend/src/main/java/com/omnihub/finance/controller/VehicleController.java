package com.omnihub.finance.controller;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.finance.service.VehicleService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {
    @Autowired private VehicleService service;

    @GetMapping
    public ResponseEntity<List<VehicleResponse>> getAll(@AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(service.getAll(u.getUsername()));
    }

    @PostMapping
    public ResponseEntity<VehicleResponse> create(@AuthenticationPrincipal UserDetails u,
                                                   @Valid @RequestBody VehicleRequest req) {
        return ResponseEntity.ok(service.create(u.getUsername(), req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails u, @PathVariable Long id) {
        service.delete(u.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/logs")
    public ResponseEntity<List<VehicleLogResponse>> getLogs(@AuthenticationPrincipal UserDetails u,
                                                             @RequestParam(required = false) Long vehicleId) {
        return ResponseEntity.ok(service.getLogs(u.getUsername(), vehicleId));
    }

    @PostMapping("/logs")
    public ResponseEntity<VehicleLogResponse> addLog(@AuthenticationPrincipal UserDetails u,
                                                      @Valid @RequestBody VehicleLogRequest req) {
        return ResponseEntity.ok(service.addLog(u.getUsername(), req));
    }

    @DeleteMapping("/logs/{id}")
    public ResponseEntity<Void> deleteLog(@AuthenticationPrincipal UserDetails u, @PathVariable Long id) {
        service.deleteLog(u.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
