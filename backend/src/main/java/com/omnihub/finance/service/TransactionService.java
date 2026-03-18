package com.omnihub.finance.service;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.finance.entity.Transaction;
import com.omnihub.finance.entity.Transaction.TransactionType;
import com.omnihub.core.entity.User;
import com.omnihub.finance.repository.TransactionRepository;
import com.omnihub.core.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TransactionService {

    @Autowired private TransactionRepository transactionRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private VehicleService vehicleService;

    private User getUser(String email) {
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public TransactionResponse create(String email, TransactionRequest req) {
        User user = getUser(email);
        Transaction t = Transaction.builder()
                .description(req.getDescription())
                .amount(req.getAmount())
                .type(req.getType())
                .category(req.getCategory())
                .date(req.getDate())
                .notes(req.getNotes())
                .itemName(req.getItemName())
                .paymentSource(req.getPaymentSource() != null ? com.omnihub.finance.entity.PaymentSource.valueOf(req.getPaymentSource()) : null)
                .cardId(req.getCardId())
                .bankAccountId(req.getBankAccountId())
                .kmReading(req.getKmReading())
                .vehicleId(req.getVehicleId())
                .user(user)
                .build();
        Transaction saved = transactionRepository.save(t);
        if (req.getVehicleId() != null && req.getKmReading() != null) {
            vehicleService.autoLog(user, req.getVehicleId(), req.getKmReading(),
                    req.getAmount(), saved.getId(), req.getDate(), req.getNotes());
        }
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getAll(String email) {
        User user = getUser(email);
        return transactionRepository.findByUserIdOrderByDateDesc(user.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getRecent(String email) {
        User user = getUser(email);
        return transactionRepository.findTop10ByUserIdOrderByDateDesc(user.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public TransactionResponse update(String email, Long id, TransactionRequest req) {
        User user = getUser(email);
        Transaction t = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));
        if (!t.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");

        t.setDescription(req.getDescription());
        t.setAmount(req.getAmount());
        t.setType(req.getType());
        t.setCategory(req.getCategory());
        t.setDate(req.getDate());
        t.setNotes(req.getNotes());
        t.setItemName(req.getItemName());
        if (req.getPaymentSource() != null) t.setPaymentSource(com.omnihub.finance.entity.PaymentSource.valueOf(req.getPaymentSource()));
        else t.setPaymentSource(null);
        t.setCardId(req.getCardId());
        t.setBankAccountId(req.getBankAccountId());
        t.setKmReading(req.getKmReading());
        t.setVehicleId(req.getVehicleId());
        return toResponse(transactionRepository.save(t));
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = getUser(email);
        Transaction t = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));
        if (!t.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        transactionRepository.delete(t);
    }

    @Transactional(readOnly = true)
    public SummaryResponse getSummary(String email) {
        User user = getUser(email);
        Long userId = user.getId();
        LocalDate now = LocalDate.now();

        BigDecimal totalIncome = transactionRepository.sumByUserIdAndType(userId, TransactionType.INCOME);
        BigDecimal totalExpenses = transactionRepository.sumByUserIdAndType(userId, TransactionType.EXPENSE);
        BigDecimal monthIncome = transactionRepository.sumByUserIdAndTypeAndMonthAndYear(userId, TransactionType.INCOME, now.getMonthValue(), now.getYear());
        BigDecimal monthExpenses = transactionRepository.sumByUserIdAndTypeAndMonthAndYear(userId, TransactionType.EXPENSE, now.getMonthValue(), now.getYear());

        totalIncome = totalIncome != null ? totalIncome : BigDecimal.ZERO;
        totalExpenses = totalExpenses != null ? totalExpenses : BigDecimal.ZERO;
        monthIncome = monthIncome != null ? monthIncome : BigDecimal.ZERO;
        monthExpenses = monthExpenses != null ? monthExpenses : BigDecimal.ZERO;

        SummaryResponse resp = new SummaryResponse();
        resp.setTotalIncome(totalIncome);
        resp.setTotalExpenses(totalExpenses);
        resp.setBalance(totalIncome.subtract(totalExpenses));
        resp.setMonthlyIncome(monthIncome);
        resp.setMonthlyExpenses(monthExpenses);
        return resp;
    }

    @Transactional(readOnly = true)
    public Map<String, BigDecimal> getExpensesByCategory(String email, int month, int year) {
        User user = getUser(email);
        List<Object[]> results = transactionRepository.sumExpensesByCategoryForMonth(user.getId(), month, year);
        return results.stream().collect(Collectors.toMap(
                row -> (String) row[0],
                row -> (BigDecimal) row[1]
        ));
    }

    @Transactional(readOnly = true)
    public Map<Integer, BigDecimal> getMonthlyTotals(String email, TransactionType type, int year) {
        User user = getUser(email);
        List<Object[]> results = transactionRepository.monthlyTotalsByType(user.getId(), type, year);
        return results.stream().collect(Collectors.toMap(
                row -> ((Number) row[0]).intValue(),
                row -> (BigDecimal) row[1]
        ));
    }

    @Transactional(readOnly = true)
    public List<Object[]> getTopItems(String email, int month, int year) {
        User user = getUser(email);
        return transactionRepository.topItemsBySpend(user.getId(), month, year);
    }

    @Transactional(readOnly = true)
    public Map<Long, BigDecimal> getSpendByCard(String email, int month, int year) {
        User user = getUser(email);
        return transactionRepository.spendByCard(user.getId(), month, year)
                .stream().collect(Collectors.toMap(r -> (Long) r[0], r -> (BigDecimal) r[1]));
    }

    @Transactional(readOnly = true)
    public PivotResponse getPivotData(String email, int year) {
        User user = getUser(email);
        List<Object[]> raw = transactionRepository.getExpensesByItemAndMonth(user.getId(), year);

        // category → item → month → amount
        Map<String, Map<String, Map<Integer, Double>>> pivot = new TreeMap<>();
        for (Object[] row : raw) {
            String cat  = (String) row[0];
            String item = (row[1] != null && !((String) row[1]).isBlank()) ? (String) row[1] : "";
            int month   = ((Number) row[2]).intValue();
            double amt  = ((BigDecimal) row[3]).doubleValue();
            pivot.computeIfAbsent(cat, k -> new TreeMap<>())
                 .computeIfAbsent(item, k -> new TreeMap<>())
                 .merge(month, amt, Double::sum);
        }

        Map<Integer, Double> grandMonthly = new TreeMap<>();
        double grandTotal = 0;
        List<PivotCategoryRow> categories = new ArrayList<>();

        for (Map.Entry<String, Map<String, Map<Integer, Double>>> catEntry : pivot.entrySet()) {
            Map<Integer, Double> catMonthly = new TreeMap<>();
            double catTotal = 0;
            List<PivotItemRow> items = new ArrayList<>();

            for (Map.Entry<String, Map<Integer, Double>> itemEntry : catEntry.getValue().entrySet()) {
                double itemTotal = 0;
                Map<Integer, Double> itemMonths = new TreeMap<>(itemEntry.getValue());
                for (double v : itemMonths.values()) itemTotal += v;

                PivotItemRow ir = new PivotItemRow();
                ir.setName(itemEntry.getKey().isEmpty() ? "(General)" : itemEntry.getKey());
                ir.setMonths(itemMonths);
                ir.setTotal(itemTotal);
                items.add(ir);

                itemMonths.forEach((m, v) -> catMonthly.merge(m, v, Double::sum));
                catTotal += itemTotal;
            }

            catMonthly.forEach((m, v) -> grandMonthly.merge(m, v, Double::sum));
            grandTotal += catTotal;

            PivotCategoryRow cr = new PivotCategoryRow();
            cr.setName(catEntry.getKey());
            cr.setItems(items);
            cr.setMonthlyTotals(catMonthly);
            cr.setTotal(catTotal);
            categories.add(cr);
        }

        PivotResponse resp = new PivotResponse();
        resp.setCategories(categories);
        resp.setGrandMonthlyTotals(grandMonthly);
        resp.setGrandTotal(grandTotal);
        return resp;
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getByBankAccount(String email, Long bankAccountId) {
        User user = getUser(email);
        return transactionRepository.findByUserIdAndBankAccountIdOrderByDateAscIdAsc(user.getId(), bankAccountId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getByCard(String email, Long cardId) {
        User user = getUser(email);
        return transactionRepository.findByUserIdAndCardIdOrderByDateAscIdAsc(user.getId(), cardId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private TransactionResponse toResponse(Transaction t) {
        TransactionResponse r = new TransactionResponse();
        r.setId(t.getId());
        r.setDescription(t.getDescription());
        r.setAmount(t.getAmount());
        r.setType(t.getType());
        r.setCategory(t.getCategory());
        r.setDate(t.getDate());
        r.setNotes(t.getNotes());
        r.setItemName(t.getItemName());
        r.setPaymentSource(t.getPaymentSource() != null ? t.getPaymentSource().name() : null);
        r.setCardId(t.getCardId());
        r.setBankAccountId(t.getBankAccountId());
        r.setKmReading(t.getKmReading());
        r.setVehicleId(t.getVehicleId());
        return r;
    }
}
