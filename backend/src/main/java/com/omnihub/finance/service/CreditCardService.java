package com.omnihub.finance.service;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.finance.entity.CreditCard;
import com.omnihub.finance.repository.CreditCardRepository;
import com.omnihub.finance.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CreditCardService {

    @Autowired private CreditCardRepository cardRepo;
    @Autowired private TransactionRepository txRepo;
    @Autowired private UserRepository userRepo;

    private User getUser(String email) {
        return userRepo.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional(readOnly = true)
    public List<CreditCardResponse> getAll(String email) {
        User user = getUser(email);
        return cardRepo.findByUserIdOrderByNameAsc(user.getId())
                .stream().map(c -> toResponse(c, user.getId())).collect(Collectors.toList());
    }

    @Transactional
    public CreditCardResponse create(String email, CreditCardRequest req) {
        User user = getUser(email);
        CreditCard card = new CreditCard();
        card.setName(req.getName());
        card.setBank(req.getBank());
        card.setCreditLimit(req.getCreditLimit());
        card.setBillingDate(req.getBillingDate());
        card.setPaymentDueDate(req.getPaymentDueDate());
        card.setLastFourDigits(req.getLastFourDigits());
        card.setCardType(req.getCardType());
        card.setBalanceDate(req.getBalanceDate());
        card.setOpeningOutstanding(req.getOpeningOutstanding() != null ? req.getOpeningOutstanding() : BigDecimal.ZERO);
        card.setUser(user);
        return toResponse(cardRepo.save(card), user.getId());
    }

    @Transactional
    public CreditCardResponse update(String email, Long id, CreditCardRequest req) {
        User user = getUser(email);
        CreditCard card = cardRepo.findById(id).orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        card.setName(req.getName());
        card.setBank(req.getBank());
        card.setCreditLimit(req.getCreditLimit());
        card.setBillingDate(req.getBillingDate());
        card.setPaymentDueDate(req.getPaymentDueDate());
        card.setLastFourDigits(req.getLastFourDigits());
        card.setCardType(req.getCardType());
        card.setBalanceDate(req.getBalanceDate());
        card.setOpeningOutstanding(req.getOpeningOutstanding() != null ? req.getOpeningOutstanding() : BigDecimal.ZERO);
        return toResponse(cardRepo.save(card), user.getId());
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = getUser(email);
        CreditCard card = cardRepo.findById(id).orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        cardRepo.delete(card);
    }

    private BigDecimal getOutstanding(CreditCard card, Long userId) {
        if (card.getBalanceDate() != null) {
            BigDecimal txExpenses = txRepo.sumCardOutstandingFromDate(userId, card.getId(), card.getBalanceDate());
            BigDecimal opening = card.getOpeningOutstanding() != null ? card.getOpeningOutstanding() : BigDecimal.ZERO;
            return opening.add(txExpenses != null ? txExpenses : BigDecimal.ZERO);
        }
        // Fall back to billing cycle logic
        LocalDate today = LocalDate.now();
        LocalDate fromDate;
        if (card.getBillingDate() != null) {
            int day = Math.min(card.getBillingDate(), today.lengthOfMonth());
            LocalDate thisMonthStatement = today.withDayOfMonth(day);
            if (!today.isBefore(thisMonthStatement)) {
                fromDate = thisMonthStatement;
            } else {
                int prevDay = Math.min(card.getBillingDate(), today.minusMonths(1).lengthOfMonth());
                fromDate = today.minusMonths(1).withDayOfMonth(prevDay);
            }
        } else {
            fromDate = today.withDayOfMonth(1);
        }
        BigDecimal outstanding = txRepo.sumCardOutstandingFromDate(userId, card.getId(), fromDate);
        return outstanding != null ? outstanding : BigDecimal.ZERO;
    }

    private CreditCardResponse toResponse(CreditCard c, Long userId) {
        CreditCardResponse r = new CreditCardResponse();
        r.setId(c.getId());
        r.setName(c.getName());
        r.setBank(c.getBank());
        r.setCreditLimit(c.getCreditLimit());
        r.setBillingDate(c.getBillingDate());
        r.setPaymentDueDate(c.getPaymentDueDate());
        r.setLastFourDigits(c.getLastFourDigits());
        r.setCardType(c.getCardType());
        r.setBalanceDate(c.getBalanceDate());
        r.setOpeningOutstanding(c.getOpeningOutstanding());
        r.setOutstanding(getOutstanding(c, userId));
        return r;
    }
}
