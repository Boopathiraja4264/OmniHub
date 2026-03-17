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
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TransactionService {

    @Autowired private TransactionRepository transactionRepository;
    @Autowired private UserRepository userRepository;

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
                .user(user)
                .build();
        return toResponse(transactionRepository.save(t));
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

    private TransactionResponse toResponse(Transaction t) {
        TransactionResponse r = new TransactionResponse();
        r.setId(t.getId());
        r.setDescription(t.getDescription());
        r.setAmount(t.getAmount());
        r.setType(t.getType());
        r.setCategory(t.getCategory());
        r.setDate(t.getDate());
        r.setNotes(t.getNotes());
        return r;
    }
}
