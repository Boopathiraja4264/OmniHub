package com.omnihub.finance.controller;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.finance.service.CreditCardService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/cards")
public class CreditCardController {
    @Autowired private CreditCardService service;

    @GetMapping
    public ResponseEntity<List<CreditCardResponse>> getAll(@AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(service.getAll(u.getUsername()));
    }

    @PostMapping
    public ResponseEntity<CreditCardResponse> create(@AuthenticationPrincipal UserDetails u,
                                                      @Valid @RequestBody CreditCardRequest req) {
        return ResponseEntity.ok(service.create(u.getUsername(), req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails u, @PathVariable Long id) {
        service.delete(u.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
