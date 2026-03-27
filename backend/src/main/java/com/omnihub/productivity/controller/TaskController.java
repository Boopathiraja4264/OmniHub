package com.omnihub.productivity.controller;

import com.omnihub.productivity.dto.ProductivityDTOs.*;
import com.omnihub.productivity.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/productivity/tasks")
public class TaskController {

    @Autowired private TaskService taskService;

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getAll(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(taskService.getAll(user.getUsername()));
    }

    @GetMapping("/active")
    public ResponseEntity<List<TaskResponse>> getActive(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(taskService.getActive(user.getUsername()));
    }

    @GetMapping("/today")
    public ResponseEntity<List<TaskResponse>> getToday(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(taskService.getToday(user.getUsername()));
    }

    @PostMapping
    public ResponseEntity<TaskResponse> create(@AuthenticationPrincipal UserDetails user,
                                               @Valid @RequestBody TaskRequest req) {
        return ResponseEntity.ok(taskService.create(user.getUsername(), req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> update(@AuthenticationPrincipal UserDetails user,
                                               @PathVariable Long id,
                                               @Valid @RequestBody TaskRequest req) {
        return ResponseEntity.ok(taskService.update(user.getUsername(), id, req));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TaskResponse> updateStatus(@AuthenticationPrincipal UserDetails user,
                                                     @PathVariable Long id,
                                                     @RequestBody TaskStatusRequest req) {
        return ResponseEntity.ok(taskService.updateStatus(user.getUsername(), id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        taskService.delete(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
