package com.omnihub.productivity.controller;

import com.omnihub.productivity.dto.ProductivityDTOs.*;
import com.omnihub.productivity.service.WeeklyTemplateService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/productivity/templates")
public class WeeklyTemplateController {

    @Autowired private WeeklyTemplateService templateService;

    @GetMapping
    public ResponseEntity<List<WeeklyTemplateResponse>> getAll(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(templateService.getAll(user.getUsername()));
    }

    @PostMapping
    public ResponseEntity<WeeklyTemplateResponse> create(@AuthenticationPrincipal UserDetails user,
                                                         @Valid @RequestBody WeeklyTemplateRequest req) {
        return ResponseEntity.ok(templateService.create(user.getUsername(), req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WeeklyTemplateResponse> update(@AuthenticationPrincipal UserDetails user,
                                                         @PathVariable Long id,
                                                         @Valid @RequestBody WeeklyTemplateRequest req) {
        return ResponseEntity.ok(templateService.update(user.getUsername(), id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        templateService.delete(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{templateId}/blocks")
    public ResponseEntity<TemplateBlockResponse> addBlock(@AuthenticationPrincipal UserDetails user,
                                                          @PathVariable Long templateId,
                                                          @Valid @RequestBody TemplateBlockRequest req) {
        return ResponseEntity.ok(templateService.addBlock(user.getUsername(), templateId, req));
    }

    @PutMapping("/blocks/{id}")
    public ResponseEntity<TemplateBlockResponse> updateBlock(@AuthenticationPrincipal UserDetails user,
                                                             @PathVariable Long id,
                                                             @Valid @RequestBody TemplateBlockRequest req) {
        return ResponseEntity.ok(templateService.updateBlock(user.getUsername(), id, req));
    }

    @DeleteMapping("/blocks/{id}")
    public ResponseEntity<Void> deleteBlock(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        templateService.deleteBlock(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
