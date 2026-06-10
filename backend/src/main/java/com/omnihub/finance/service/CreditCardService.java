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
        // balanceDate is the anchor: openingOutstanding = what was owed on that date,
        // then add all charges and subtract all payments from that date forward.
        // Without balanceDate, count all transactions ever recorded for this card.
        LocalDate fromDate = card.getBalanceDate() != null
                ? card.getBalanceDate()
                : LocalDate.of(1970, 1, 1);

        BigDecimal opening  = card.getOpeningOutstanding() != null ? card.getOpeningOutstanding() : BigDecimal.ZERO;
        BigDecimal expenses = txRepo.sumCardOutstandingFromDate(userId, card.getId(), fromDate);
        BigDecimal payments = txRepo.sumCardPaymentsFromDate(userId, card.getId(), fromDate);
        return opening
            .add(expenses != null ? expenses : BigDecimal.ZERO)
            .subtract(payments != null ? payments : BigDecimal.ZERO);
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
