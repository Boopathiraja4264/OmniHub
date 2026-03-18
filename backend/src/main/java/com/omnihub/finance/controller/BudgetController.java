package com.omnihub.finance.controller;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.finance.service.BudgetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    @Autowired private BudgetService budgetService;

    @PostMapping
    public ResponseEntity<BudgetResponse> create(@AuthenticationPrincipal UserDetails user,
                                                  @Valid @RequestBody BudgetRequest req) {
        return ResponseEntity.ok(budgetService.create(user.getUsername(), req));
    }

    @GetMapping
    public ResponseEntity<List<BudgetResponse>> getForMonth(@AuthenticationPrincipal UserDetails user,
                                                             @RequestParam int month,
                                                             @RequestParam int year) {
        return ResponseEntity.ok(budgetService.getForMonth(user.getUsername(), month, year));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        budgetService.delete(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<BudgetResponse> updateLimit(@AuthenticationPrincipal UserDetails user,
                                                       @PathVariable Long id,
                                                       @Valid @RequestBody BudgetUpdateRequest req) {
        return ResponseEntity.ok(budgetService.updateLimit(user.getUsername(), id, req.getLimitAmount()));
    }

    @GetMapping("/annual")
    public ResponseEntity<AnnualBudgetResponse> getAnnual(@AuthenticationPrincipal UserDetails user,
                                                           @RequestParam int year) {
        return ResponseEntity.ok(budgetService.getAnnual(user.getUsername(), year));
    }

    @PostMapping("/annual")
    public ResponseEntity<Void> setAnnual(@AuthenticationPrincipal UserDetails user,
                                           @Valid @RequestBody AnnualBudgetRequest req) {
        budgetService.setAnnualBudget(user.getUsername(), req);
        return ResponseEntity.ok().build();
    }
}
