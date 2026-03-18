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

    @GetMapping("/analytics/top-items")
    public ResponseEntity<java.util.Map<String, java.math.BigDecimal>> getTopItems(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam int month, @RequestParam int year) {
        java.util.Map<String, java.math.BigDecimal> result = new java.util.LinkedHashMap<>();
        transactionService.getTopItems(user.getUsername(), month, year)
                .forEach(row -> result.put((String) row[0], (java.math.BigDecimal) row[1]));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/analytics/card-spend")
    public ResponseEntity<java.util.Map<Long, java.math.BigDecimal>> getCardSpend(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam int month, @RequestParam int year) {
        return ResponseEntity.ok(transactionService.getSpendByCard(user.getUsername(), month, year));
    }

    @GetMapping("/analytics/pivot")
    public ResponseEntity<PivotResponse> getPivot(@AuthenticationPrincipal UserDetails user,
                                                   @RequestParam int year) {
        return ResponseEntity.ok(transactionService.getPivotData(user.getUsername(), year));
    }

    @GetMapping("/by-bank-account/{accountId}")
    public ResponseEntity<List<TransactionResponse>> getByBankAccount(
            @AuthenticationPrincipal UserDetails user, @PathVariable Long accountId) {
        return ResponseEntity.ok(transactionService.getByBankAccount(user.getUsername(), accountId));
    }

    @GetMapping("/by-card/{cardId}")
    public ResponseEntity<List<TransactionResponse>> getByCard(
            @AuthenticationPrincipal UserDetails user, @PathVariable Long cardId) {
        return ResponseEntity.ok(transactionService.getByCard(user.getUsername(), cardId));
    }
}
