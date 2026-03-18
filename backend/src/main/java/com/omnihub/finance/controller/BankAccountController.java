package com.omnihub.finance.controller;

import com.omnihub.core.dto.DTOs.BankAccountRequest;
import com.omnihub.core.dto.DTOs.BankAccountResponse;
import com.omnihub.finance.service.BankAccountService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bank-accounts")
public class BankAccountController {

    @Autowired private BankAccountService service;

    @GetMapping
    public ResponseEntity<?> getAll(@AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(service.getAll(u.getUsername()));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody @Valid BankAccountRequest req,
                                     @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(service.create(u.getUsername(), req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, @AuthenticationPrincipal UserDetails u) {
        service.delete(u.getUsername(), id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/default")
    public ResponseEntity<BankAccountResponse> setDefault(@AuthenticationPrincipal UserDetails u, @PathVariable Long id) {
        return ResponseEntity.ok(service.setDefault(u.getUsername(), id));
    }
}
