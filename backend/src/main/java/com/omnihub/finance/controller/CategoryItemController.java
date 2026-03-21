package com.omnihub.finance.controller;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.finance.service.CategoryItemService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/finance")
public class CategoryItemController {

    @Autowired private CategoryItemService service;

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryResponse>> getCategories(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(service.getCategories(user.getUsername()));
    }

    @PostMapping("/categories")
    public ResponseEntity<CategoryResponse> addCategory(@AuthenticationPrincipal UserDetails user,
                                                         @Valid @RequestBody CategoryRequest req) {
        return ResponseEntity.ok(service.addCategory(user.getUsername(), req));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@AuthenticationPrincipal UserDetails user,
                                                @PathVariable Long id) {
        service.deleteCategory(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/items")
    public ResponseEntity<List<ItemResponse>> getItems(@AuthenticationPrincipal UserDetails user,
                                                        @RequestParam(required = false) Long categoryId) {
        if (categoryId != null) return ResponseEntity.ok(service.getItems(user.getUsername(), categoryId));
        return ResponseEntity.ok(service.getAllItems(user.getUsername()));
    }

    @PostMapping("/items")
    public ResponseEntity<ItemResponse> addItem(@AuthenticationPrincipal UserDetails user,
                                                 @Valid @RequestBody ItemRequest req) {
        return ResponseEntity.ok(service.addItem(user.getUsername(), req));
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> deleteItem(@AuthenticationPrincipal UserDetails user,
                                            @PathVariable Long id) {
        service.deleteItem(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/categories/reset")
    public ResponseEntity<Void> resetCategories(@AuthenticationPrincipal UserDetails user) {
        service.resetAndReseed(user.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/categories/deduplicate")
    public ResponseEntity<java.util.Map<String, Integer>> deduplicateCategories(@AuthenticationPrincipal UserDetails user) {
        int removed = service.deduplicateCategories(user.getUsername());
        return ResponseEntity.ok(java.util.Map.of("removed", removed));
    }
}
