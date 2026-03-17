package com.omnihub.finance.service;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.finance.entity.Budget;
import com.omnihub.finance.entity.Transaction.TransactionType;
import com.omnihub.core.entity.User;
import com.omnihub.finance.repository.BudgetRepository;
import com.omnihub.finance.repository.TransactionRepository;
import com.omnihub.core.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BudgetService {

    @Autowired
    private BudgetRepository budgetRepository;
    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private UserRepository userRepository;

    private User getUser(String email) {
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public BudgetResponse create(String email, BudgetRequest req) {
        User user = getUser(email);

        Budget budget = Budget.builder()
                .category(req.getCategory())
                .limitAmount(req.getLimitAmount())
                .monthNumber(req.getMonth())
                .year(req.getYear())
                .user(user)
                .build();

        return toResponse(budgetRepository.save(budget), BigDecimal.ZERO);
    }

    @Transactional(readOnly = true)
    public List<BudgetResponse> getForMonth(String email, int month, int year) {
        User user = getUser(email);
        List<Budget> budgets = budgetRepository.findByUserIdAndMonthNumberAndYear(user.getId(), month, year);
        if (budgets.isEmpty()) return List.of();
        // Single batch query for all category spending — eliminates N+1
        Map<String, BigDecimal> spentByCategory = transactionRepository
                .sumExpensesByCategoryForMonth(user.getId(), month, year)
                .stream().collect(Collectors.toMap(row -> (String) row[0], row -> (BigDecimal) row[1]));
        return budgets.stream()
                .map(b -> toResponse(b, spentByCategory.getOrDefault(b.getCategory(), BigDecimal.ZERO)))
                .collect(Collectors.toList());
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = getUser(email);
        Budget b = budgetRepository.findById(id).orElseThrow(() -> new RuntimeException("Budget not found"));
        if (!b.getUser().getId().equals(user.getId()))
            throw new RuntimeException("Unauthorized");
        budgetRepository.delete(b);
    }

    private BudgetResponse toResponse(Budget b, BigDecimal spent) {
        BudgetResponse r = new BudgetResponse();
        r.setId(b.getId());
        r.setCategory(b.getCategory());
        r.setLimitAmount(b.getLimitAmount());
        r.setSpent(spent);
        r.setMonth(b.getMonthNumber());
        r.setYear(b.getYear());
        return r;
    }
}
