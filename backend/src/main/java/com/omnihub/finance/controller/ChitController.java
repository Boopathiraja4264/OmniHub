package com.omnihub.finance.controller;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.finance.service.ChitService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chit")
public class ChitController {

    @Autowired private ChitService chitService;

    // ─── Chit Groups ──────────────────────────────────────────────────────────

    @GetMapping("/groups")
    public ResponseEntity<List<ChitGroupResponse>> getAll(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(chitService.getAll(user.getUsername()));
    }

    @PostMapping("/groups")
    public ResponseEntity<ChitGroupResponse> create(@AuthenticationPrincipal UserDetails user,
                                                     @Valid @RequestBody ChitGroupRequest req) {
        return ResponseEntity.ok(chitService.create(user.getUsername(), req));
    }

    @GetMapping("/groups/{id}")
    public ResponseEntity<ChitGroupResponse> getById(@AuthenticationPrincipal UserDetails user,
                                                      @PathVariable Long id) {
        return ResponseEntity.ok(chitService.getById(user.getUsername(), id));
    }

    @PutMapping("/groups/{id}")
    public ResponseEntity<ChitGroupResponse> update(@AuthenticationPrincipal UserDetails user,
                                                     @PathVariable Long id,
                                                     @Valid @RequestBody ChitGroupRequest req) {
        return ResponseEntity.ok(chitService.update(user.getUsername(), id, req));
    }

    @DeleteMapping("/groups/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails user,
                                        @PathVariable Long id) {
        chitService.delete(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    // ─── Batches ──────────────────────────────────────────────────────────────

    @PutMapping("/batches/{batchId}")
    public ResponseEntity<ChitBatchResponse> updateBatch(@AuthenticationPrincipal UserDetails user,
                                                          @PathVariable Long batchId,
                                                          @RequestBody ChitBatchUpdateRequest req) {
        return ResponseEntity.ok(chitService.updateBatch(user.getUsername(), batchId, req));
    }

    // ─── Monthly Entries ──────────────────────────────────────────────────────

    @PutMapping("/entries/{entryId}/kasir")
    public ResponseEntity<ChitMonthlyEntryResponse> updateKasir(@AuthenticationPrincipal UserDetails user,
                                                                  @PathVariable Long entryId,
                                                                  @RequestBody ChitKasirUpdateRequest req) {
        return ResponseEntity.ok(chitService.updateKasir(user.getUsername(), entryId, req));
    }

    @PutMapping("/entries/{entryId}/payment")
    public ResponseEntity<ChitMonthlyEntryResponse> updatePayment(@AuthenticationPrincipal UserDetails user,
                                                                  @PathVariable Long entryId,
                                                                  @RequestBody ChitPaymentUpdateRequest req) {
        return ResponseEntity.ok(chitService.updatePayment(user.getUsername(), entryId, req));
    }
}
