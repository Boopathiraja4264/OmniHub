package com.financetracker.controller;

import com.financetracker.dto.DTOs.*;
import com.financetracker.service.BudgetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}
