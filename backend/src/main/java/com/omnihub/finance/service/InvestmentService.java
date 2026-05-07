package com.omnihub.finance.service;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.finance.entity.RdFdInvestment;
import com.omnihub.finance.entity.RdMonthlyPayment;
import com.omnihub.finance.repository.RdFdRepository;
import com.omnihub.finance.repository.RdMonthlyPaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class InvestmentService {

    @Autowired private RdFdRepository rdFdRepository;
    @Autowired private RdMonthlyPaymentRepository paymentRepository;
    @Autowired private UserRepository userRepository;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ─── Interest calculations ────────────────────────────────────────────────

    /**
     * FD maturity using quarterly compounding:
     * M = P × (1 + r/400)^(n/3)
     * where r = annual rate in % (e.g. 6.5), n = tenure in months
     */
    private BigDecimal calcFdMaturity(BigDecimal principal, BigDecimal ratePercent, int tenureMonths) {
        double r = ratePercent.doubleValue();
        double n = tenureMonths;
        double quarterly = r / 400.0;
        double quarters = n / 3.0;
        double maturity = principal.doubleValue() * Math.pow(1 + quarterly, quarters);
        return BigDecimal.valueOf(maturity).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * RD maturity using quarterly compounding — each installment earns interest
     * for the remaining period:
     * M = Σ(m=1..n) P × (1 + r/400)^((n−m)/3)
     */
    private BigDecimal calcRdMaturity(BigDecimal monthly, BigDecimal ratePercent, int tenureMonths) {
        double P = monthly.doubleValue();
        double r = ratePercent.doubleValue();
        double quarterly = r / 400.0;
        double total = 0;
        for (int m = 1; m <= tenureMonths; m++) {
            double monthsRemaining = tenureMonths - m;
            total += P * Math.pow(1 + quarterly, monthsRemaining / 3.0);
        }
        return BigDecimal.valueOf(total).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Current value as of today (partially elapsed tenure):
     * FD: same formula but with elapsed months
     * RD: sum over months that have elapsed
     */
    private BigDecimal calcCurrentValue(RdFdInvestment inv) {
        LocalDate today = LocalDate.now();
        int elapsed = (int) ChronoUnit.MONTHS.between(inv.getStartDate(), today);
        elapsed = Math.min(elapsed, inv.getTenureMonths());
        if (elapsed <= 0) {
            return inv.getType().equals("FD") ? inv.getAmount() : BigDecimal.ZERO;
        }
        if ("FD".equals(inv.getType())) {
            return calcFdMaturity(inv.getAmount(), inv.getAnnualInterestRate(), elapsed);
        } else {
            return calcRdMaturity(inv.getAmount(), inv.getAnnualInterestRate(), elapsed);
        }
    }

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    @Transactional
    public RdFdResponse create(String email, RdFdRequest req) {
        User user = getUser(email);
        RdFdInvestment inv = new RdFdInvestment();
        inv.setUser(user);
        applyFields(inv, req);
        inv = rdFdRepository.save(inv);
        return toResponse(inv, List.of());
    }

    @Transactional(readOnly = true)
    public InvestmentDashboardResponse getDashboard(String email) {
        User user = getUser(email);
        List<RdFdInvestment> all = rdFdRepository.findByUserIdOrderByStartDateDesc(user.getId());

        BigDecimal totalInvested = BigDecimal.ZERO;
        BigDecimal totalMaturity = BigDecimal.ZERO;
        BigDecimal efTotal = BigDecimal.ZERO;
        int activeCount = 0;

        List<RdFdResponse> fdList = new java.util.ArrayList<>();
        List<RdFdResponse> rdList = new java.util.ArrayList<>();

        for (RdFdInvestment inv : all) {
            List<RdMonthlyPayment> payments = "RD".equals(inv.getType())
                    ? paymentRepository.findByInvestmentIdOrderByMonthNumberAsc(inv.getId())
                    : List.of();
            RdFdResponse r = toResponse(inv, payments);

            totalInvested = totalInvested.add(r.getTotalInvested());
            totalMaturity = totalMaturity.add(r.getMaturityAmount());
            if ("ACTIVE".equals(inv.getStatus())) activeCount++;
            if (inv.isEmergencyFund()) efTotal = efTotal.add(r.getEfPrincipal());

            if ("FD".equals(inv.getType())) fdList.add(r);
            else rdList.add(r);
        }

        InvestmentDashboardResponse dash = new InvestmentDashboardResponse();
        dash.setTotalInvested(totalInvested);
        dash.setTotalMaturityValue(totalMaturity);
        dash.setTotalInterestEarned(totalMaturity.subtract(totalInvested));
        dash.setEmergencyFundTotal(efTotal);
        dash.setActiveCount(activeCount);
        dash.setFdList(fdList);
        dash.setRdList(rdList);
        return dash;
    }

    @Transactional(readOnly = true)
    public RdFdResponse getById(String email, Long id) {
        User user = getUser(email);
        RdFdInvestment inv = findOwned(id, user);
        List<RdMonthlyPayment> payments = "RD".equals(inv.getType())
                ? paymentRepository.findByInvestmentIdOrderByMonthNumberAsc(id)
                : List.of();
        return toResponse(inv, payments);
    }

    @Transactional
    public RdFdResponse update(String email, Long id, RdFdRequest req) {
        User user = getUser(email);
        RdFdInvestment inv = findOwned(id, user);
        applyFields(inv, req);
        inv = rdFdRepository.save(inv);
        List<RdMonthlyPayment> payments = "RD".equals(inv.getType())
                ? paymentRepository.findByInvestmentIdOrderByMonthNumberAsc(id)
                : List.of();
        return toResponse(inv, payments);
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = getUser(email);
        RdFdInvestment inv = findOwned(id, user);
        paymentRepository.deleteByInvestmentId(id);
        rdFdRepository.delete(inv);
    }

    // ─── RD Payment tracking ──────────────────────────────────────────────────

    @Transactional
    public RdMonthlyPaymentResponse addPayment(String email, Long id, RdMonthlyPaymentRequest req) {
        User user = getUser(email);
        RdFdInvestment inv = findOwned(id, user);
        RdMonthlyPayment p = new RdMonthlyPayment();
        p.setInvestment(inv);
        p.setMonthNumber(req.getMonthNumber());
        p.setPaymentDate(req.getPaymentDate());
        p.setAmountPaid(req.getAmountPaid() != null ? req.getAmountPaid() : inv.getAmount());
        p.setNotes(req.getNotes());
        p = paymentRepository.save(p);
        return toPaymentResponse(p);
    }

    @Transactional
    public void deletePayment(String email, Long paymentId) {
        RdMonthlyPayment p = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));
        getUser(email); // verify user exists
        paymentRepository.delete(p);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private RdFdInvestment findOwned(Long id, User user) {
        RdFdInvestment inv = rdFdRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Investment not found"));
        if (!inv.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        return inv;
    }

    private void applyFields(RdFdInvestment inv, RdFdRequest req) {
        inv.setType(req.getType().toUpperCase());
        inv.setName(req.getName());
        inv.setBankName(req.getBankName());
        inv.setAmount(req.getAmount());
        inv.setAnnualInterestRate(req.getAnnualInterestRate());
        inv.setTenureMonths(req.getTenureMonths());
        inv.setStartDate(req.getStartDate());
        inv.setEmergencyFund(req.isEmergencyFund());
        inv.setStatus(req.getStatus() != null ? req.getStatus() : "ACTIVE");
        inv.setNotes(req.getNotes());
    }

    private RdFdResponse toResponse(RdFdInvestment inv, List<RdMonthlyPayment> payments) {
        RdFdResponse r = new RdFdResponse();
        r.setId(inv.getId());
        r.setType(inv.getType());
        r.setName(inv.getName());
        r.setBankName(inv.getBankName());
        r.setAmount(inv.getAmount());
        r.setAnnualInterestRate(inv.getAnnualInterestRate());
        r.setTenureMonths(inv.getTenureMonths());
        r.setStartDate(inv.getStartDate());
        r.setMaturityDate(inv.getStartDate().plusMonths(inv.getTenureMonths()));
        r.setEmergencyFund(inv.isEmergencyFund());
        r.setStatus(inv.getStatus());
        r.setNotes(inv.getNotes());

        if ("FD".equals(inv.getType())) {
            BigDecimal total = inv.getAmount();
            BigDecimal maturity = calcFdMaturity(inv.getAmount(), inv.getAnnualInterestRate(), inv.getTenureMonths());
            r.setTotalInvested(total);
            r.setMaturityAmount(maturity);
            r.setInterestEarned(maturity.subtract(total));
            r.setCurrentValue(calcCurrentValue(inv));
            r.setEfPrincipal(total); // EF = principal only, no interest
            r.setMonthsPaid(0);
            r.setPayments(List.of());
        } else {
            BigDecimal total = inv.getAmount().multiply(BigDecimal.valueOf(inv.getTenureMonths()));
            BigDecimal maturity = calcRdMaturity(inv.getAmount(), inv.getAnnualInterestRate(), inv.getTenureMonths());
            int monthsPaid = payments.size();
            BigDecimal efPrincipal = inv.getAmount().multiply(BigDecimal.valueOf(monthsPaid));
            r.setTotalInvested(total);
            r.setMaturityAmount(maturity);
            r.setInterestEarned(maturity.subtract(total));
            r.setCurrentValue(calcCurrentValue(inv));
            r.setEfPrincipal(efPrincipal);
            r.setMonthsPaid(monthsPaid);
            r.setPayments(payments.stream().map(this::toPaymentResponse).collect(Collectors.toList()));
        }
        return r;
    }

    private RdMonthlyPaymentResponse toPaymentResponse(RdMonthlyPayment p) {
        RdMonthlyPaymentResponse r = new RdMonthlyPaymentResponse();
        r.setId(p.getId());
        r.setMonthNumber(p.getMonthNumber());
        r.setPaymentDate(p.getPaymentDate());
        r.setAmountPaid(p.getAmountPaid());
        r.setNotes(p.getNotes());
        return r;
    }
}
