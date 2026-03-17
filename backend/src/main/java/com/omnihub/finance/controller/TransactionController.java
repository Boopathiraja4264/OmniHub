package com.omnihub.finance.controller;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.finance.entity.Transaction.TransactionType;
import com.omnihub.finance.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    @Autowired private TransactionService transactionService;

    @PostMapping
    public ResponseEntity<TransactionResponse> create(@AuthenticationPrincipal UserDetails user,
                                                       @Valid @RequestBody TransactionRequest req) {
        return ResponseEntity.ok(transactionService.create(user.getUsername(), req));
    }

    @GetMapping
    public ResponseEntity<List<TransactionResponse>> getAll(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(transactionService.getAll(user.getUsername()));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<TransactionResponse>> getRecent(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(transactionService.getRecent(user.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransactionResponse> update(@AuthenticationPrincipal UserDetails user,
                                                       @PathVariable Long id,
                                                       @Valid @RequestBody TransactionRequest req) {
        return ResponseEntity.ok(transactionService.update(user.getUsername(), id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        transactionService.delete(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary")
    public ResponseEntity<SummaryResponse> getSummary(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(transactionService.getSummary(user.getUsername()));
    }

    @GetMapping("/analytics/by-category")
    public ResponseEntity<Map<String, BigDecimal>> getByCategory(@AuthenticationPrincipal UserDetails user,
                                                                   @RequestParam int month,
                                                                   @RequestParam int year) {
        return ResponseEntity.ok(transactionService.getExpensesByCategory(user.getUsername(), month, year));
    }

    @GetMapping("/analytics/monthly")
    public ResponseEntity<Map<Integer, BigDecimal>> getMonthly(@AuthenticationPrincipal UserDetails user,
                                                                @RequestParam TransactionType type,
                                                                @RequestParam int year) {
        return ResponseEntity.ok(transactionService.getMonthlyTotals(user.getUsername(), type, year));
    }
}
