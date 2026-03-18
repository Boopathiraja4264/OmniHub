package com.omnihub.finance.service;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.finance.entity.BankAccount;
import com.omnihub.finance.entity.Transaction.TransactionType;
import com.omnihub.finance.repository.BankAccountRepository;
import com.omnihub.finance.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BankAccountService {

    @Autowired private BankAccountRepository bankRepo;
    @Autowired private TransactionRepository txRepo;
    @Autowired private UserRepository userRepo;

    private User getUser(String email) {
        return userRepo.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional(readOnly = true)
    public List<BankAccountResponse> getAll(String email) {
        User user = getUser(email);
        return bankRepo.findByUserIdOrderByNameAsc(user.getId())
                .stream().map(a -> toResponse(a, user.getId())).collect(Collectors.toList());
    }

    @Transactional
    public BankAccountResponse create(String email, BankAccountRequest req) {
        User user = getUser(email);
        if (req.isDefault()) {
            bankRepo.clearDefaultForUser(user.getId());
        }
        BankAccount acc = new BankAccount();
        acc.setName(req.getName());
        acc.setBankName(req.getBankName());
        acc.setAccountType(req.getAccountType());
        acc.setOpeningBalance(req.getOpeningBalance() != null ? req.getOpeningBalance() : BigDecimal.ZERO);
        acc.setDefault(req.isDefault());
        acc.setUser(user);
        return toResponse(bankRepo.save(acc), user.getId());
    }

    @Transactional
    public BankAccountResponse setDefault(String email, Long id) {
        User user = getUser(email);
        // Clear previous default using entity-level save (avoids JPQL bulk update cache issues)
        bankRepo.findByUserIdAndIsDefaultTrue(user.getId()).ifPresent(current -> {
            current.setDefault(false);
            bankRepo.save(current);
        });
        // Load with ownership check — no lazy user access needed
        BankAccount acc = bankRepo.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new RuntimeException("Account not found"));
        acc.setDefault(true);
        bankRepo.save(acc);
        return toResponse(acc, user.getId());
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = getUser(email);
        BankAccount acc = bankRepo.findById(id).orElseThrow(() -> new RuntimeException("Account not found"));
        if (!acc.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        bankRepo.delete(acc);
    }

    private BankAccountResponse toResponse(BankAccount a, Long userId) {
        BigDecimal inflow  = txRepo.sumByBankAccountIdAndType(userId, a.getId(), TransactionType.INCOME);
        BigDecimal outflow = txRepo.sumByBankAccountIdAndType(userId, a.getId(), TransactionType.EXPENSE);
        inflow  = inflow  != null ? inflow  : BigDecimal.ZERO;
        outflow = outflow != null ? outflow : BigDecimal.ZERO;

        BankAccountResponse r = new BankAccountResponse();
        r.setId(a.getId());
        r.setName(a.getName());
        r.setBankName(a.getBankName());
        r.setAccountType(a.getAccountType());
        r.setOpeningBalance(a.getOpeningBalance());
        r.setTotalInflow(inflow);
        r.setTotalOutflow(outflow);
        r.setCurrentBalance(a.getOpeningBalance().add(inflow).subtract(outflow));
        r.setDefault(a.isDefault());
        return r;
    }
}
