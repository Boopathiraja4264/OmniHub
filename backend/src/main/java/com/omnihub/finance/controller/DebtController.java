package com.omnihub.finance.controller;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.finance.service.DebtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/debt")
public class DebtController {

    @Autowired private DebtService debtService;

    // ── Dashboard ──────────────────────────────────────────────────────────────
    @GetMapping("/dashboard")
    public ResponseEntity<DebtDashboardResponse> getDashboard(@AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(debtService.getDashboard(u.getUsername()));
    }

    // ── EMI Loans ──────────────────────────────────────────────────────────────
    @GetMapping("/emi/{id}")
    public ResponseEntity<EmiLoanDetailResponse> getEmi(@PathVariable Long id,
                                                         @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(debtService.getEmiLoan(u.getUsername(), id));
    }

    @PostMapping("/emi")
    public ResponseEntity<EmiLoanDetailResponse> createEmi(@RequestBody EmiLoanRequest req,
                                                            @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(debtService.createEmiLoan(u.getUsername(), req));
    }

    @PutMapping("/emi/{id}")
    public ResponseEntity<EmiLoanDetailResponse> updateEmi(@PathVariable Long id,
                                                            @RequestBody EmiLoanRequest req,
                                                            @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(debtService.updateEmiLoan(u.getUsername(), id, req));
    }

    @DeleteMapping("/emi/{id}")
    public ResponseEntity<?> deleteEmi(@PathVariable Long id, @AuthenticationPrincipal UserDetails u) {
        debtService.deleteEmiLoan(u.getUsername(), id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/emi/installment/{instId}/toggle")
    public ResponseEntity<EmiInstallmentResponse> toggleInstallment(@PathVariable Long instId,
                                                                      @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(debtService.toggleInstallmentPaid(u.getUsername(), instId));
    }

    // ── Annual Loans ──────────────────────────────────────────────────────────
    @GetMapping("/annual/{id}")
    public ResponseEntity<AnnualLoanDetailResponse> getAnnual(@PathVariable Long id,
                                                               @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(debtService.getAnnualLoan(u.getUsername(), id));
    }

    @PostMapping("/annual")
    public ResponseEntity<AnnualLoanDetailResponse> createAnnual(@RequestBody AnnualLoanRequest req,
                                                                   @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(debtService.createAnnualLoan(u.getUsername(), req));
    }

    @PutMapping("/annual/{id}")
    public ResponseEntity<AnnualLoanDetailResponse> updateAnnual(@PathVariable Long id,
                                                                   @RequestBody AnnualLoanRequest req,
                                                                   @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(debtService.updateAnnualLoan(u.getUsername(), id, req));
    }

    @DeleteMapping("/annual/{id}")
    public ResponseEntity<?> deleteAnnual(@PathVariable Long id, @AuthenticationPrincipal UserDetails u) {
        debtService.deleteAnnualLoan(u.getUsername(), id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/annual/{id}/prepayment")
    public ResponseEntity<AnnualLoanDetailResponse> addPrepayment(@PathVariable Long id,
                                                                    @RequestBody PrepaymentRequest req,
                                                                    @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(debtService.addPrepayment(u.getUsername(), id, req));
    }

    @DeleteMapping("/annual/prepayment/{prepId}")
    public ResponseEntity<?> deletePrepayment(@PathVariable Long prepId,
                                               @AuthenticationPrincipal UserDetails u) {
        debtService.deletePrepayment(u.getUsername(), prepId);
        return ResponseEntity.ok().build();
    }

    // ── Borrowed Loans ────────────────────────────────────────────────────────
    @GetMapping("/borrowed/{id}")
    public ResponseEntity<BorrowedLoanDetailResponse> getBorrowed(@PathVariable Long id,
                                                                    @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(debtService.getBorrowedLoan(u.getUsername(), id));
    }

    @PostMapping("/borrowed")
    public ResponseEntity<BorrowedLoanDetailResponse> createBorrowed(@RequestBody BorrowedLoanRequest req,
                                                                       @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(debtService.createBorrowedLoan(u.getUsername(), req));
    }

    @PutMapping("/borrowed/{id}")
    public ResponseEntity<BorrowedLoanDetailResponse> updateBorrowed(@PathVariable Long id,
                                                                       @RequestBody BorrowedLoanRequest req,
                                                                       @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(debtService.updateBorrowedLoan(u.getUsername(), id, req));
    }

    @DeleteMapping("/borrowed/{id}")
    public ResponseEntity<?> deleteBorrowed(@PathVariable Long id, @AuthenticationPrincipal UserDetails u) {
        debtService.deleteBorrowedLoan(u.getUsername(), id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/borrowed/{id}/repayment")
    public ResponseEntity<BorrowedLoanDetailResponse> addRepayment(@PathVariable Long id,
                                                                     @RequestBody BorrowedRepaymentRequest req,
                                                                     @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(debtService.addRepayment(u.getUsername(), id, req));
    }

    @DeleteMapping("/borrowed/repayment/{repId}")
    public ResponseEntity<?> deleteRepayment(@PathVariable Long repId,
                                              @AuthenticationPrincipal UserDetails u) {
        debtService.deleteRepayment(u.getUsername(), repId);
        return ResponseEntity.ok().build();
    }
}
