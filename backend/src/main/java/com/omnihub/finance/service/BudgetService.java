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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
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

    public BudgetResponse create(String email, BudgetRequest req) {
        User user = getUser(email);

        Budget budget = Budget.builder()
                .category(req.getCategory())
                .limitAmount(req.getLimitAmount())
                .monthNumber(req.getMonth())
                .year(req.getYear())
                .user(user)
                .build();

        return toResponse(budgetRepository.save(budget), user.getId());
    }

    public List<BudgetResponse> getForMonth(String email, int month, int year) {
        User user = getUser(email);
        return budgetRepository.findByUserIdAndMonthNumberAndYear(user.getId(), month, year)
                .stream().map(b -> toResponse(b, user.getId())).collect(Collectors.toList());
    }

    public void delete(String email, Long id) {
        User user = getUser(email);
        Budget b = budgetRepository.findById(id).orElseThrow(() -> new RuntimeException("Budget not found"));
        if (!b.getUser().getId().equals(user.getId()))
            throw new RuntimeException("Unauthorized");
        budgetRepository.delete(b);
    }

    private BudgetResponse toResponse(Budget b, Long userId) {
        LocalDate start = YearMonth.of(b.getYear(), b.getMonthNumber()).atDay(1);
        LocalDate end = YearMonth.of(b.getYear(), b.getMonthNumber()).atEndOfMonth();
        List<?> txns = transactionRepository.findByUserIdAndCategoryAndDateBetween(userId, b.getCategory(), start, end);

        BigDecimal spent = txns.stream()
                .map(t -> ((com.omnihub.finance.entity.Transaction) t).getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

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
