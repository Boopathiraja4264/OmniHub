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
import java.math.RoundingMode;
import java.util.*;
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

    @Transactional
    public void setAnnualBudget(String email, AnnualBudgetRequest req) {
        User user = getUser(email);
        for (int m = 1; m <= 12; m++) {
            Optional<Budget> existing = budgetRepository.findByUserIdAndCategoryAndMonthNumberAndYear(
                    user.getId(), req.getCategory(), m, req.getYear());
            if (existing.isPresent()) {
                Budget b = existing.get();
                b.setLimitAmount(req.getMonthlyBudget());
                budgetRepository.save(b);
            } else {
                Budget b = Budget.builder()
                        .category(req.getCategory())
                        .limitAmount(req.getMonthlyBudget())
                        .monthNumber(m)
                        .year(req.getYear())
                        .user(user)
                        .build();
                budgetRepository.save(b);
            }
        }
    }

    @Transactional(readOnly = true)
    public AnnualBudgetResponse getAnnual(String email, int year) {
        User user = getUser(email);
        Long userId = user.getId();

        // Single query for all budgets in the year
        List<Budget> budgets = budgetRepository.findByUserIdAndYear(userId, year);

        // Single query for all expense totals by category + month in the year
        // row = [category, month, sum]
        Map<String, Map<Integer, BigDecimal>> spentMap = new HashMap<>();
        transactionRepository.sumExpensesByCategoryAndMonthForYear(userId, year)
                .forEach(row -> spentMap
                        .computeIfAbsent((String) row[0], k -> new HashMap<>())
                        .put(((Number) row[1]).intValue(), (BigDecimal) row[2]));

        // Group budgets by category → month
        Map<String, Map<Integer, Budget>> budgetMap = new LinkedHashMap<>();
        budgets.forEach(b -> budgetMap
                .computeIfAbsent(b.getCategory(), k -> new HashMap<>())
                .put(b.getMonthNumber(), b));

        List<AnnualCategoryRow> rows = new ArrayList<>();
        BigDecimal grandTotalBudgeted = BigDecimal.ZERO;
        BigDecimal grandTotalUtilised = BigDecimal.ZERO;

        for (Map.Entry<String, Map<Integer, Budget>> entry : budgetMap.entrySet()) {
            String category = entry.getKey();
            Map<Integer, Budget> monthBudgets = entry.getValue();
            Map<Integer, BigDecimal> spent = spentMap.getOrDefault(category, Map.of());

            Map<Integer, MonthData> months = new LinkedHashMap<>();
            Map<Integer, Long> budgetIds = new LinkedHashMap<>();
            Map<Integer, BigDecimal> monthlyBudgets = new LinkedHashMap<>();
            BigDecimal totalBudgeted = BigDecimal.ZERO;
            BigDecimal totalUtilised = BigDecimal.ZERO;

            for (int m = 1; m <= 12; m++) {
                Budget b = monthBudgets.get(m);
                if (b != null) {
                    BigDecimal limit = b.getLimitAmount();
                    BigDecimal utilised = spent.getOrDefault(m, BigDecimal.ZERO);
                    BigDecimal remaining = limit.subtract(utilised);
                    double pct = limit.compareTo(BigDecimal.ZERO) > 0
                            ? utilised.multiply(BigDecimal.valueOf(100))
                                    .divide(limit, 2, RoundingMode.HALF_UP).doubleValue()
                            : 0.0;
                    months.put(m, new MonthData(utilised, remaining, pct));
                    budgetIds.put(m, b.getId());
                    monthlyBudgets.put(m, limit);
                    totalBudgeted = totalBudgeted.add(limit);
                    totalUtilised = totalUtilised.add(utilised);
                }
            }

            double ytdPct = totalBudgeted.compareTo(BigDecimal.ZERO) > 0
                    ? totalUtilised.multiply(BigDecimal.valueOf(100))
                            .divide(totalBudgeted, 2, RoundingMode.HALF_UP).doubleValue()
                    : 0.0;

            AnnualCategoryRow row = new AnnualCategoryRow();
            row.setCategory(category);
            row.setMonths(months);
            row.setBudgetIds(budgetIds);
            row.setMonthlyBudgets(monthlyBudgets);
            row.setTotalBudgeted(totalBudgeted);
            row.setTotalUtilised(totalUtilised);
            row.setYtdPct(ytdPct);
            rows.add(row);

            grandTotalBudgeted = grandTotalBudgeted.add(totalBudgeted);
            grandTotalUtilised = grandTotalUtilised.add(totalUtilised);
        }

        rows.sort(Comparator.comparing(AnnualCategoryRow::getCategory));

        double overallPct = grandTotalBudgeted.compareTo(BigDecimal.ZERO) > 0
                ? grandTotalUtilised.multiply(BigDecimal.valueOf(100))
                        .divide(grandTotalBudgeted, 2, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        AnnualBudgetResponse resp = new AnnualBudgetResponse();
        resp.setYear(year);
        resp.setCategories(rows);
        resp.setGrandTotalBudgeted(grandTotalBudgeted);
        resp.setGrandTotalUtilised(grandTotalUtilised);
        resp.setOverallPct(overallPct);
        return resp;
    }

    @Transactional
    public BudgetResponse updateLimit(String email, Long id, BigDecimal newLimit) {
        User user = getUser(email);
        Budget b = budgetRepository.findById(id).orElseThrow(() -> new RuntimeException("Budget not found"));
        if (!b.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        b.setLimitAmount(newLimit);
        Budget saved = budgetRepository.save(b);
        BigDecimal spent = transactionRepository.sumByUserIdAndTypeAndMonthAndYear(
                user.getId(), TransactionType.EXPENSE, saved.getMonthNumber(), saved.getYear());
        return toResponse(saved, spent != null ? spent : BigDecimal.ZERO);
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
