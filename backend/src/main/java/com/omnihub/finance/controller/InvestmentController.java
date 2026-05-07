package com.omnihub.finance.controller;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.finance.service.InvestmentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/investments")
public class InvestmentController {

    @Autowired private InvestmentService investmentService;

    @GetMapping("/dashboard")
    public ResponseEntity<InvestmentDashboardResponse> getDashboard(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(investmentService.getDashboard(user.getUsername()));
    }

    @PostMapping
    public ResponseEntity<RdFdResponse> create(@AuthenticationPrincipal UserDetails user,
                                                @Valid @RequestBody RdFdRequest req) {
        return ResponseEntity.ok(investmentService.create(user.getUsername(), req));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RdFdResponse> getById(@AuthenticationPrincipal UserDetails user,
                                                 @PathVariable Long id) {
        return ResponseEntity.ok(investmentService.getById(user.getUsername(), id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RdFdResponse> update(@AuthenticationPrincipal UserDetails user,
                                                @PathVariable Long id,
                                                @Valid @RequestBody RdFdRequest req) {
        return ResponseEntity.ok(investmentService.update(user.getUsername(), id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails user,
                                        @PathVariable Long id) {
        investmentService.delete(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    // ─── RD Payment tracking ──────────────────────────────────────────────────

    @PostMapping("/{id}/payments")
    public ResponseEntity<RdMonthlyPaymentResponse> addPayment(@AuthenticationPrincipal UserDetails user,
                                                                @PathVariable Long id,
                                                                @RequestBody RdMonthlyPaymentRequest req) {
        return ResponseEntity.ok(investmentService.addPayment(user.getUsername(), id, req));
    }

    @DeleteMapping("/payments/{paymentId}")
    public ResponseEntity<Void> deletePayment(@AuthenticationPrincipal UserDetails user,
                                               @PathVariable Long paymentId) {
        investmentService.deletePayment(user.getUsername(), paymentId);
        return ResponseEntity.noContent().build();
    }
}
