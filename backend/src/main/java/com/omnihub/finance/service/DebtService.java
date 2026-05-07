package com.omnihub.finance.service;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.finance.entity.*;
import com.omnihub.finance.entity.EmiLoan.EmiStatus;
import com.omnihub.finance.entity.AnnualLoan.LoanStatus;
import com.omnihub.finance.entity.BorrowedLoan.BorrowStatus;
import com.omnihub.finance.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DebtService {

    @Autowired private EmiLoanRepository emiLoanRepo;
    @Autowired private EmiInstallmentRepository emiInstRepo;
    @Autowired private AnnualLoanRepository annualLoanRepo;
    @Autowired private PrepaymentEntryRepository prepaymentRepo;
    @Autowired private BorrowedLoanRepository borrowedLoanRepo;
    @Autowired private BorrowedRepaymentRepository borrowedRepaymentRepo;
    @Autowired private UserRepository userRepository;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ─── Seed ─────────────────────────────────────────────────────────────────

    @Transactional
    public void seedExistingData() {
        for (String email : new String[]{"boopathirajalearning@gmail.com", "boopathigame123@gmail.com"}) {
            userRepository.findByEmail(email).ifPresent(this::seedForUser);
        }
    }

    public void seedForUser(User user) {
        if (emiLoanRepo.existsByUserId(user.getId())) return;

        // ── EMI Loans ──────────────────────────────────────────────────────────
        // GA001: Macbook, 24M @ 15.99%, GST 18%, 14 paid (Active)
        seedEmiLoan(user, "GA001", "Macbook EMI", 93531, 0.1599, 24, 0.18,
                LocalDate.of(2025, 3, 10), LocalDate.of(2027, 3, 10),
                EmiStatus.ACTIVE, 14, false, null, 0, 0, 0, null);

        // GA002: Oneplus, 24M @ 16%, GST 18%, 5 paid (Active)
        seedEmiLoan(user, "GA002", "Oneplus", 23297, 0.16, 24, 0.18,
                LocalDate.of(2025, 12, 14), LocalDate.of(2027, 12, 14),
                EmiStatus.ACTIVE, 5, false, null, 0, 0, 0, null);

        // GA003: Monitor, 3M @ 16.75%, GST 18%, 3 paid (Closed)
        seedEmiLoan(user, "GA003", "Monitor", 8800, 0.1675, 3, 0.18,
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 5, 1),
                EmiStatus.CLOSED, 3, false, null, 0, 0, 0, null);

        // PL001: Personal Loan, 24M @ 13.25%, no GST, Foreclosed at 104141
        seedEmiLoan(user, "PL001", "Personal Loan", 210000, 0.1325, 24, 0.0,
                LocalDate.of(2025, 2, 5), LocalDate.of(2027, 2, 5),
                EmiStatus.FORECLOSED, 12, true,
                LocalDate.of(2026, 2, 14), 104141, 103757, 384, null);

        // ── Annual / Gold Loans ────────────────────────────────────────────────
        // GL001: TMB Gold 280K @ 9.9%, Repaid
        AnnualLoan gl001 = seedAnnualLoan(user, "GL001", "TMB Gold Loan", 280000, 0.099,
                LocalDate.of(2024, 11, 27), LocalDate.of(2025, 11, 27),
                LoanStatus.REPAID, 0, 14698.65, 15354);
        seedPrepayment(gl001, LocalDate.of(2024, 12, 22), 42000, 1898.63);
        seedPrepayment(gl001, LocalDate.of(2024, 12, 31), 20000, 580.98);
        seedPrepayment(gl001, LocalDate.of(2025, 1, 1),   50000, 59.13);
        seedPrepayment(gl001, LocalDate.of(2025, 3, 8),   20000, 3007.43);
        seedPrepayment(gl001, LocalDate.of(2025, 10, 22), 148000, 9152.48);

        // GL002: TMB Gold 50K @ 11.5%, Outstanding
        seedAnnualLoan(user, "GL002", "TMB Gold Loan", 50000, 0.115,
                LocalDate.of(2025, 10, 22), LocalDate.of(2026, 10, 22),
                LoanStatus.OUTSTANDING, 50000, 5750, 0);

        // ── Borrowed ──────────────────────────────────────────────────────────
        // BR001: Kandasamy M, 55K borrowed, 48K repaid
        BorrowedLoan br001 = seedBorrowedLoan(user, "BR001", "Kandasamy M", 55000, 48000,
                LocalDate.of(2025, 3, 1), BorrowStatus.OUTSTANDING, null);
        seedBorrowedRepayment(br001, LocalDate.of(2025, 3, 1), 48000, "Partial repayment");

        // BR002: Kandasamy M, 10K, Repaid
        BorrowedLoan br002 = seedBorrowedLoan(user, "BR002", "Kandasamy M", 10000, 10000,
                LocalDate.of(2025, 3, 1), BorrowStatus.REPAID, null);
        seedBorrowedRepayment(br002, LocalDate.of(2025, 4, 1), 10000, "Full repayment");

        // BR003: Santhamani K, 6K, Outstanding
        seedBorrowedLoan(user, "BR003", "Santhamani K", 6000, 0,
                LocalDate.of(2025, 8, 23), BorrowStatus.OUTSTANDING, null);

        // BR004: Vignesh K, 10K, Outstanding
        seedBorrowedLoan(user, "BR004", "Vignesh K", 10000, 0,
                LocalDate.of(2025, 8, 23), BorrowStatus.OUTSTANDING, null);
    }

    // ─── Seed helpers ─────────────────────────────────────────────────────────

    private void seedEmiLoan(User user, String loanId, String name,
            double principal, double annualRate, int tenureMonths, double gstRate,
            LocalDate startDate, LocalDate endDate, EmiStatus status,
            int installmentsPaid, boolean foreclosed, LocalDate foreclosureDate,
            double foreclosureAmount, double foreclosurePrincipal, double foreclosureInterest,
            String notes) {

        EmiLoan loan = new EmiLoan();
        loan.setUser(user);
        loan.setLoanId(loanId);
        loan.setName(name);
        loan.setInitialPrincipal(BigDecimal.valueOf(principal));
        loan.setAnnualInterestRate(BigDecimal.valueOf(annualRate));
        loan.setTenureMonths(tenureMonths);
        loan.setGstRate(gstRate > 0 ? BigDecimal.valueOf(gstRate) : BigDecimal.ZERO);
        loan.setStartDate(startDate);
        loan.setEndDate(endDate);
        loan.setStatus(status);
        loan.setForeclosed(foreclosed);
        if (foreclosed) {
            loan.setForeclosureDate(foreclosureDate);
            loan.setForeclosureAmount(BigDecimal.valueOf(foreclosureAmount));
            loan.setForeclosurePrincipal(BigDecimal.valueOf(foreclosurePrincipal));
            loan.setForeclosureInterest(BigDecimal.valueOf(foreclosureInterest));
        }
        loan.setNotes(notes);

        // Generate amortization schedule
        BigDecimal P = BigDecimal.valueOf(principal);
        BigDecimal r = BigDecimal.valueOf(annualRate / 12); // monthly rate
        BigDecimal gst = BigDecimal.valueOf(gstRate);
        BigDecimal n = BigDecimal.valueOf(tenureMonths);
        MathContext mc = new MathContext(15, RoundingMode.HALF_UP);

        // EMI = P * r * (1+r)^n / ((1+r)^n - 1)
        BigDecimal onePlusR = BigDecimal.ONE.add(r);
        BigDecimal onePlusRpowN = onePlusR.pow(tenureMonths, mc);
        BigDecimal baseEmi;
        if (r.compareTo(BigDecimal.ZERO) == 0) {
            baseEmi = P.divide(n, 4, RoundingMode.HALF_UP);
        } else {
            baseEmi = P.multiply(r).multiply(onePlusRpowN)
                    .divide(onePlusRpowN.subtract(BigDecimal.ONE), 4, RoundingMode.HALF_UP);
        }
        loan.setBaseEmi(baseEmi);

        // Compute totals from paid installments
        BigDecimal totalPrincipalPaid = BigDecimal.ZERO;
        BigDecimal totalInterestPaid = BigDecimal.ZERO;
        BigDecimal totalGstPaid = BigDecimal.ZERO;

        emiLoanRepo.save(loan);

        // Generate installments
        BigDecimal balance = P;
        for (int i = 1; i <= tenureMonths; i++) {
            BigDecimal interestPart = balance.multiply(r).setScale(4, RoundingMode.HALF_UP);
            BigDecimal principalPart = baseEmi.subtract(interestPart).setScale(4, RoundingMode.HALF_UP);
            BigDecimal gstPart = interestPart.multiply(gst).setScale(4, RoundingMode.HALF_UP);
            BigDecimal totalEmi = principalPart.add(interestPart).add(gstPart).setScale(4, RoundingMode.HALF_UP);
            BigDecimal closing = balance.subtract(principalPart).setScale(4, RoundingMode.HALF_UP);
            if (closing.compareTo(BigDecimal.ZERO) < 0) closing = BigDecimal.ZERO;

            EmiInstallment inst = new EmiInstallment();
            inst.setEmiLoan(loan);
            inst.setInstallmentNumber(i);
            inst.setDueDate(startDate.plusMonths(i - 1));
            inst.setOpeningPrincipal(balance.setScale(4, RoundingMode.HALF_UP));
            inst.setPrincipalPart(principalPart);
            inst.setInterestPart(interestPart);
            inst.setGstPart(gstPart);
            inst.setEmiAmount(totalEmi);
            inst.setClosingPrincipal(closing);
            inst.setPaid(i <= installmentsPaid);
            emiInstRepo.save(inst);

            if (i <= installmentsPaid) {
                totalPrincipalPaid = totalPrincipalPaid.add(principalPart);
                totalInterestPaid = totalInterestPaid.add(interestPart);
                totalGstPaid = totalGstPaid.add(gstPart);
            }
            balance = closing;
        }

        loan.setPrincipalPaid(totalPrincipalPaid.setScale(2, RoundingMode.HALF_UP));
        loan.setInterestPaid(totalInterestPaid.setScale(2, RoundingMode.HALF_UP));
        loan.setGstPaid(totalGstPaid.setScale(2, RoundingMode.HALF_UP));
        emiLoanRepo.save(loan);
    }

    private AnnualLoan seedAnnualLoan(User user, String loanId, String name,
            double principal, double rate, LocalDate startDate, LocalDate endDate,
            LoanStatus status, double currentBalance, double interestAccrued, double interestPaid) {
        AnnualLoan loan = new AnnualLoan();
        loan.setUser(user);
        loan.setLoanId(loanId);
        loan.setName(name);
        loan.setInitialPrincipal(BigDecimal.valueOf(principal));
        loan.setAnnualInterestRate(BigDecimal.valueOf(rate));
        loan.setStartDate(startDate);
        loan.setEndDate(endDate);
        loan.setStatus(status);
        loan.setCurrentBalance(BigDecimal.valueOf(currentBalance));
        loan.setTotalInterestAccrued(BigDecimal.valueOf(interestAccrued));
        loan.setInterestPaid(BigDecimal.valueOf(interestPaid));
        return annualLoanRepo.save(loan);
    }

    private void seedPrepayment(AnnualLoan loan, LocalDate date, double amount, double interest) {
        PrepaymentEntry e = new PrepaymentEntry();
        e.setAnnualLoan(loan);
        e.setPaymentDate(date);
        e.setAmount(BigDecimal.valueOf(amount));
        e.setInterestAccrued(BigDecimal.valueOf(interest));
        prepaymentRepo.save(e);
    }

    private BorrowedLoan seedBorrowedLoan(User user, String loanId, String lender,
            double borrowed, double repaid, LocalDate date, BorrowStatus status, String notes) {
        BorrowedLoan loan = new BorrowedLoan();
        loan.setUser(user);
        loan.setLoanId(loanId);
        loan.setLenderName(lender);
        loan.setAmountBorrowed(BigDecimal.valueOf(borrowed));
        loan.setAmountRepaid(BigDecimal.valueOf(repaid));
        loan.setDateBorrowed(date);
        loan.setStatus(status);
        loan.setNotes(notes);
        return borrowedLoanRepo.save(loan);
    }

    private void seedBorrowedRepayment(BorrowedLoan loan, LocalDate date, double amount, String note) {
        BorrowedRepayment r = new BorrowedRepayment();
        r.setBorrowedLoan(loan);
        r.setPaymentDate(date);
        r.setAmount(BigDecimal.valueOf(amount));
        r.setNote(note);
        borrowedRepaymentRepo.save(r);
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public DebtDashboardResponse getDashboard(String email) {
        User user = getUser(email);
        List<EmiLoan> emiLoans = emiLoanRepo.findByUserIdOrderByStartDateDesc(user.getId());
        List<AnnualLoan> annualLoans = annualLoanRepo.findByUserIdOrderByStartDateDesc(user.getId());
        List<BorrowedLoan> borrowedLoans = borrowedLoanRepo.findByUserIdOrderByDateBorrowedDesc(user.getId());

        BigDecimal totalInitial = BigDecimal.ZERO;
        BigDecimal totalOutstanding = BigDecimal.ZERO;

        // EMI loans
        for (EmiLoan l : emiLoans) {
            totalInitial = totalInitial.add(l.getInitialPrincipal());
            if (l.getStatus() == EmiStatus.ACTIVE) {
                // outstanding = initial - principalPaid
                BigDecimal paid = l.getPrincipalPaid() != null ? l.getPrincipalPaid() : BigDecimal.ZERO;
                totalOutstanding = totalOutstanding.add(l.getInitialPrincipal().subtract(paid));
            }
        }

        // Annual loans
        for (AnnualLoan l : annualLoans) {
            totalInitial = totalInitial.add(l.getInitialPrincipal());
            if (l.getStatus() == LoanStatus.OUTSTANDING) {
                BigDecimal bal = l.getCurrentBalance() != null ? l.getCurrentBalance() : BigDecimal.ZERO;
                totalOutstanding = totalOutstanding.add(bal);
            }
        }

        // Borrowed
        for (BorrowedLoan l : borrowedLoans) {
            totalInitial = totalInitial.add(l.getAmountBorrowed());
            if (l.getStatus() == BorrowStatus.OUTSTANDING) {
                totalOutstanding = totalOutstanding.add(l.getOutstandingBalance());
            }
        }

        double progress = totalInitial.compareTo(BigDecimal.ZERO) > 0
                ? totalInitial.subtract(totalOutstanding).divide(totalInitial, 4, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        // Monthly EMI outflow (active loans)
        BigDecimal monthlyEmi = emiLoans.stream()
                .filter(l -> l.getStatus() == EmiStatus.ACTIVE)
                .map(l -> {
                    BigDecimal gst = l.getGstRate() != null ? l.getGstRate() : BigDecimal.ZERO;
                    return l.getBaseEmi().multiply(BigDecimal.ONE.add(gst));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        DebtDashboardResponse resp = new DebtDashboardResponse();
        resp.setTotalInitialPrincipal(totalInitial.setScale(2, RoundingMode.HALF_UP));
        resp.setTotalOutstanding(totalOutstanding.setScale(2, RoundingMode.HALF_UP));
        resp.setDebtFreeProgress(progress);
        resp.setMonthlyEmiOutflow(monthlyEmi);
        resp.setEmiLoans(emiLoans.stream().map(this::toEmiSummary).collect(Collectors.toList()));
        resp.setAnnualLoans(annualLoans.stream().map(this::toAnnualSummary).collect(Collectors.toList()));
        resp.setBorrowedLoans(borrowedLoans.stream().map(this::toBorrowedSummary).collect(Collectors.toList()));
        return resp;
    }

    // ─── EMI CRUD ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public EmiLoanDetailResponse getEmiLoan(String email, Long id) {
        User user = getUser(email);
        EmiLoan loan = emiLoanRepo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
        if (!loan.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        return toEmiDetail(loan);
    }

    @Transactional
    public EmiLoanDetailResponse createEmiLoan(String email, EmiLoanRequest req) {
        User user = getUser(email);
        EmiLoan loan = new EmiLoan();
        loan.setUser(user);
        applyEmiFields(loan, req);
        emiLoanRepo.save(loan);
        generateSchedule(loan);
        return toEmiDetail(emiLoanRepo.findById(loan.getId()).orElseThrow());
    }

    @Transactional
    public EmiLoanDetailResponse updateEmiLoan(String email, Long id, EmiLoanRequest req) {
        User user = getUser(email);
        EmiLoan loan = emiLoanRepo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
        if (!loan.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        applyEmiFields(loan, req);
        emiInstRepo.deleteAll(emiInstRepo.findByEmiLoanIdOrderByInstallmentNumberAsc(loan.getId()));
        emiLoanRepo.save(loan);
        generateSchedule(loan);
        return toEmiDetail(emiLoanRepo.findById(loan.getId()).orElseThrow());
    }

    @Transactional
    public void deleteEmiLoan(String email, Long id) {
        User user = getUser(email);
        EmiLoan loan = emiLoanRepo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
        if (!loan.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        emiLoanRepo.delete(loan);
    }

    @Transactional
    public EmiInstallmentResponse toggleInstallmentPaid(String email, Long instId) {
        EmiInstallment inst = emiInstRepo.findById(instId).orElseThrow(() -> new RuntimeException("Not found"));
        User user = getUser(email);
        if (!inst.getEmiLoan().getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        inst.setPaid(!inst.isPaid());
        emiInstRepo.save(inst);
        // Recompute paid totals on loan
        recomputeEmiTotals(inst.getEmiLoan());
        return toInstallmentResp(inst);
    }

    private void recomputeEmiTotals(EmiLoan loan) {
        List<EmiInstallment> insts = emiInstRepo.findByEmiLoanIdOrderByInstallmentNumberAsc(loan.getId());
        BigDecimal pp = BigDecimal.ZERO, ip = BigDecimal.ZERO, gp = BigDecimal.ZERO;
        for (EmiInstallment i : insts) {
            if (i.isPaid()) {
                pp = pp.add(i.getPrincipalPart());
                ip = ip.add(i.getInterestPart());
                gp = gp.add(i.getGstPart());
            }
        }
        loan.setPrincipalPaid(pp.setScale(2, RoundingMode.HALF_UP));
        loan.setInterestPaid(ip.setScale(2, RoundingMode.HALF_UP));
        loan.setGstPaid(gp.setScale(2, RoundingMode.HALF_UP));
        emiLoanRepo.save(loan);
    }

    private void applyEmiFields(EmiLoan loan, EmiLoanRequest req) {
        loan.setLoanId(req.getLoanId());
        loan.setName(req.getName());
        loan.setInitialPrincipal(req.getInitialPrincipal());
        loan.setAnnualInterestRate(req.getAnnualInterestRate());
        loan.setTenureMonths(req.getTenureMonths());
        loan.setGstRate(req.getGstRate() != null ? req.getGstRate() : BigDecimal.ZERO);
        loan.setStartDate(req.getStartDate());
        loan.setEndDate(req.getStartDate().plusMonths(req.getTenureMonths() - 1));
        loan.setStatus(EmiStatus.valueOf(req.getStatus() != null ? req.getStatus() : "ACTIVE"));
        loan.setNotes(req.getNotes());
        loan.setForeclosed(Boolean.TRUE.equals(req.getForeclosed()));
        if (loan.isForeclosed()) {
            loan.setForeclosureDate(req.getForeclosureDate());
            loan.setForeclosureAmount(req.getForeclosureAmount());
            loan.setForeclosurePrincipal(req.getForeclosurePrincipal());
            loan.setForeclosureInterest(req.getForeclosureInterest());
        }
        // Compute base EMI
        BigDecimal P = loan.getInitialPrincipal();
        BigDecimal r = loan.getAnnualInterestRate().divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
        if (r.compareTo(BigDecimal.ZERO) == 0) {
            loan.setBaseEmi(P.divide(BigDecimal.valueOf(loan.getTenureMonths()), 4, RoundingMode.HALF_UP));
        } else {
            BigDecimal onePlusRpowN = BigDecimal.ONE.add(r).pow(loan.getTenureMonths(), new MathContext(15));
            loan.setBaseEmi(P.multiply(r).multiply(onePlusRpowN)
                    .divide(onePlusRpowN.subtract(BigDecimal.ONE), 4, RoundingMode.HALF_UP));
        }
    }

    private void generateSchedule(EmiLoan loan) {
        BigDecimal P = loan.getInitialPrincipal();
        BigDecimal r = loan.getAnnualInterestRate().divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
        BigDecimal gstRate = loan.getGstRate() != null ? loan.getGstRate() : BigDecimal.ZERO;
        BigDecimal baseEmi = loan.getBaseEmi();
        BigDecimal balance = P;
        LocalDate today = LocalDate.now();

        for (int i = 1; i <= loan.getTenureMonths(); i++) {
            BigDecimal interestPart = balance.multiply(r).setScale(4, RoundingMode.HALF_UP);
            BigDecimal principalPart = baseEmi.subtract(interestPart).setScale(4, RoundingMode.HALF_UP);
            BigDecimal gstPart = interestPart.multiply(gstRate).setScale(4, RoundingMode.HALF_UP);
            BigDecimal totalEmi = principalPart.add(interestPart).add(gstPart).setScale(4, RoundingMode.HALF_UP);
            BigDecimal closing = balance.subtract(principalPart).setScale(4, RoundingMode.HALF_UP);
            if (closing.compareTo(BigDecimal.ZERO) < 0) closing = BigDecimal.ZERO;
            LocalDate dueDate = loan.getStartDate().plusMonths(i - 1);

            EmiInstallment inst = new EmiInstallment();
            inst.setEmiLoan(loan);
            inst.setInstallmentNumber(i);
            inst.setDueDate(dueDate);
            inst.setOpeningPrincipal(balance.setScale(4, RoundingMode.HALF_UP));
            inst.setPrincipalPart(principalPart);
            inst.setInterestPart(interestPart);
            inst.setGstPart(gstPart);
            inst.setEmiAmount(totalEmi);
            inst.setClosingPrincipal(closing);
            inst.setPaid(!dueDate.isAfter(today));
            emiInstRepo.save(inst);
            balance = closing;
        }
        recomputeEmiTotals(loan);
    }

    // ─── Annual CRUD ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AnnualLoanDetailResponse getAnnualLoan(String email, Long id) {
        User user = getUser(email);
        AnnualLoan loan = annualLoanRepo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
        if (!loan.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        return toAnnualDetail(loan);
    }

    @Transactional
    public AnnualLoanDetailResponse createAnnualLoan(String email, AnnualLoanRequest req) {
        User user = getUser(email);
        AnnualLoan loan = new AnnualLoan();
        loan.setUser(user);
        applyAnnualFields(loan, req);
        annualLoanRepo.save(loan);
        return toAnnualDetail(loan);
    }

    @Transactional
    public AnnualLoanDetailResponse updateAnnualLoan(String email, Long id, AnnualLoanRequest req) {
        User user = getUser(email);
        AnnualLoan loan = annualLoanRepo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
        if (!loan.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        applyAnnualFields(loan, req);
        annualLoanRepo.save(loan);
        return toAnnualDetail(loan);
    }

    @Transactional
    public void deleteAnnualLoan(String email, Long id) {
        User user = getUser(email);
        AnnualLoan loan = annualLoanRepo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
        if (!loan.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        annualLoanRepo.delete(loan);
    }

    @Transactional
    public AnnualLoanDetailResponse addPrepayment(String email, Long loanId, PrepaymentRequest req) {
        User user = getUser(email);
        AnnualLoan loan = annualLoanRepo.findById(loanId).orElseThrow(() -> new RuntimeException("Not found"));
        if (!loan.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        PrepaymentEntry e = new PrepaymentEntry();
        e.setAnnualLoan(loan);
        e.setPaymentDate(req.getPaymentDate());
        e.setAmount(req.getAmount());
        e.setInterestAccrued(req.getInterestAccrued());
        prepaymentRepo.save(e);
        // Update current balance
        loan.setCurrentBalance(loan.getCurrentBalance().subtract(req.getAmount()));
        if (loan.getCurrentBalance().compareTo(BigDecimal.ZERO) <= 0) {
            loan.setCurrentBalance(BigDecimal.ZERO);
            loan.setStatus(LoanStatus.REPAID);
        }
        loan.setInterestPaid(loan.getInterestPaid() != null
                ? loan.getInterestPaid().add(req.getInterestAccrued() != null ? req.getInterestAccrued() : BigDecimal.ZERO)
                : req.getInterestAccrued());
        annualLoanRepo.save(loan);
        return toAnnualDetail(annualLoanRepo.findById(loanId).orElseThrow());
    }

    @Transactional
    public void deletePrepayment(String email, Long prepId) {
        PrepaymentEntry e = prepaymentRepo.findById(prepId).orElseThrow(() -> new RuntimeException("Not found"));
        User user = getUser(email);
        if (!e.getAnnualLoan().getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        prepaymentRepo.delete(e);
    }

    private void applyAnnualFields(AnnualLoan loan, AnnualLoanRequest req) {
        loan.setLoanId(req.getLoanId());
        loan.setName(req.getName());
        loan.setInitialPrincipal(req.getInitialPrincipal());
        loan.setAnnualInterestRate(req.getAnnualInterestRate());
        loan.setStartDate(req.getStartDate());
        loan.setEndDate(req.getEndDate());
        loan.setStatus(LoanStatus.valueOf(req.getStatus() != null ? req.getStatus() : "OUTSTANDING"));
        loan.setCurrentBalance(req.getCurrentBalance() != null ? req.getCurrentBalance() : req.getInitialPrincipal());
        loan.setTotalInterestAccrued(req.getTotalInterestAccrued());
        loan.setInterestPaid(req.getInterestPaid() != null ? req.getInterestPaid() : BigDecimal.ZERO);
        loan.setNotes(req.getNotes());
    }

    // ─── Borrowed CRUD ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public BorrowedLoanDetailResponse getBorrowedLoan(String email, Long id) {
        User user = getUser(email);
        BorrowedLoan loan = borrowedLoanRepo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
        if (!loan.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        return toBorrowedDetail(loan);
    }

    @Transactional
    public BorrowedLoanDetailResponse createBorrowedLoan(String email, BorrowedLoanRequest req) {
        User user = getUser(email);
        BorrowedLoan loan = new BorrowedLoan();
        loan.setUser(user);
        applyBorrowedFields(loan, req);
        borrowedLoanRepo.save(loan);
        return toBorrowedDetail(loan);
    }

    @Transactional
    public BorrowedLoanDetailResponse updateBorrowedLoan(String email, Long id, BorrowedLoanRequest req) {
        User user = getUser(email);
        BorrowedLoan loan = borrowedLoanRepo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
        if (!loan.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        applyBorrowedFields(loan, req);
        borrowedLoanRepo.save(loan);
        return toBorrowedDetail(loan);
    }

    @Transactional
    public void deleteBorrowedLoan(String email, Long id) {
        User user = getUser(email);
        BorrowedLoan loan = borrowedLoanRepo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
        if (!loan.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        borrowedLoanRepo.delete(loan);
    }

    @Transactional
    public BorrowedLoanDetailResponse addRepayment(String email, Long loanId, BorrowedRepaymentRequest req) {
        User user = getUser(email);
        BorrowedLoan loan = borrowedLoanRepo.findById(loanId).orElseThrow(() -> new RuntimeException("Not found"));
        if (!loan.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        BorrowedRepayment r = new BorrowedRepayment();
        r.setBorrowedLoan(loan);
        r.setPaymentDate(req.getPaymentDate());
        r.setAmount(req.getAmount());
        r.setNote(req.getNote());
        borrowedRepaymentRepo.save(r);
        loan.setAmountRepaid(loan.getAmountRepaid().add(req.getAmount()));
        if (loan.getOutstandingBalance().compareTo(BigDecimal.ZERO) <= 0) {
            loan.setStatus(BorrowStatus.REPAID);
        }
        borrowedLoanRepo.save(loan);
        return toBorrowedDetail(borrowedLoanRepo.findById(loanId).orElseThrow());
    }

    @Transactional
    public void deleteRepayment(String email, Long repId) {
        BorrowedRepayment r = borrowedRepaymentRepo.findById(repId).orElseThrow(() -> new RuntimeException("Not found"));
        User user = getUser(email);
        if (!r.getBorrowedLoan().getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        BorrowedLoan loan = r.getBorrowedLoan();
        loan.setAmountRepaid(loan.getAmountRepaid().subtract(r.getAmount()));
        if (loan.getAmountRepaid().compareTo(BigDecimal.ZERO) < 0) loan.setAmountRepaid(BigDecimal.ZERO);
        loan.setStatus(loan.getOutstandingBalance().compareTo(BigDecimal.ZERO) <= 0 ? BorrowStatus.REPAID : BorrowStatus.OUTSTANDING);
        borrowedLoanRepo.save(loan);
        borrowedRepaymentRepo.delete(r);
    }

    private void applyBorrowedFields(BorrowedLoan loan, BorrowedLoanRequest req) {
        loan.setLoanId(req.getLoanId());
        loan.setLenderName(req.getLenderName());
        loan.setAmountBorrowed(req.getAmountBorrowed());
        loan.setAmountRepaid(req.getAmountRepaid() != null ? req.getAmountRepaid() : BigDecimal.ZERO);
        loan.setDateBorrowed(req.getDateBorrowed());
        loan.setStatus(BorrowStatus.valueOf(req.getStatus() != null ? req.getStatus() : "OUTSTANDING"));
        loan.setNotes(req.getNotes());
    }

    // ─── Mapping helpers ──────────────────────────────────────────────────────

    private EmiLoanSummaryResponse toEmiSummary(EmiLoan l) {
        EmiLoanSummaryResponse r = new EmiLoanSummaryResponse();
        r.setId(l.getId()); r.setLoanId(l.getLoanId()); r.setName(l.getName());
        r.setInitialPrincipal(l.getInitialPrincipal()); r.setAnnualInterestRate(l.getAnnualInterestRate());
        r.setTenureMonths(l.getTenureMonths()); r.setGstRate(l.getGstRate()); r.setBaseEmi(l.getBaseEmi());
        r.setStartDate(l.getStartDate()); r.setEndDate(l.getEndDate()); r.setStatus(l.getStatus().name());
        r.setPrincipalPaid(l.getPrincipalPaid()); r.setInterestPaid(l.getInterestPaid()); r.setGstPaid(l.getGstPaid());
        r.setForeclosed(l.isForeclosed()); r.setForeclosureDate(l.getForeclosureDate());
        r.setForeclosureAmount(l.getForeclosureAmount());
        BigDecimal paid = l.getPrincipalPaid() != null ? l.getPrincipalPaid() : BigDecimal.ZERO;
        r.setOutstandingPrincipal(l.getStatus() == EmiStatus.ACTIVE
                ? l.getInitialPrincipal().subtract(paid).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);
        // Future interest = remaining installments' interest
        List<EmiInstallment> insts = emiInstRepo.findByEmiLoanIdOrderByInstallmentNumberAsc(l.getId());
        BigDecimal futureInterest = insts.stream().filter(i -> !i.isPaid())
                .map(EmiInstallment::getInterestPart).reduce(BigDecimal.ZERO, BigDecimal::add);
        r.setFutureInterest(futureInterest.setScale(2, RoundingMode.HALF_UP));
        r.setNotes(l.getNotes());
        return r;
    }

    private EmiLoanDetailResponse toEmiDetail(EmiLoan l) {
        EmiLoanDetailResponse r = new EmiLoanDetailResponse();
        r.setSummary(toEmiSummary(l));
        List<EmiInstallment> insts = emiInstRepo.findByEmiLoanIdOrderByInstallmentNumberAsc(l.getId());
        r.setInstallments(insts.stream().map(this::toInstallmentResp).collect(Collectors.toList()));
        return r;
    }

    private EmiInstallmentResponse toInstallmentResp(EmiInstallment i) {
        EmiInstallmentResponse r = new EmiInstallmentResponse();
        r.setId(i.getId()); r.setInstallmentNumber(i.getInstallmentNumber());
        r.setDueDate(i.getDueDate()); r.setOpeningPrincipal(i.getOpeningPrincipal());
        r.setEmiAmount(i.getEmiAmount()); r.setPrincipalPart(i.getPrincipalPart());
        r.setInterestPart(i.getInterestPart()); r.setGstPart(i.getGstPart());
        r.setClosingPrincipal(i.getClosingPrincipal()); r.setPaid(i.isPaid());
        return r;
    }

    private AnnualLoanSummaryResponse toAnnualSummary(AnnualLoan l) {
        AnnualLoanSummaryResponse r = new AnnualLoanSummaryResponse();
        r.setId(l.getId()); r.setLoanId(l.getLoanId()); r.setName(l.getName());
        r.setInitialPrincipal(l.getInitialPrincipal()); r.setAnnualInterestRate(l.getAnnualInterestRate());
        r.setStartDate(l.getStartDate()); r.setEndDate(l.getEndDate()); r.setStatus(l.getStatus().name());
        r.setCurrentBalance(l.getCurrentBalance()); r.setTotalInterestAccrued(l.getTotalInterestAccrued());
        r.setInterestPaid(l.getInterestPaid()); r.setNotes(l.getNotes());
        return r;
    }

    private AnnualLoanDetailResponse toAnnualDetail(AnnualLoan l) {
        AnnualLoanDetailResponse r = new AnnualLoanDetailResponse();
        r.setSummary(toAnnualSummary(l));
        List<PrepaymentEntry> preps = prepaymentRepo.findByAnnualLoanIdOrderByPaymentDateAsc(l.getId());
        r.setPrepayments(preps.stream().map(p -> {
            PrepaymentResponse pr = new PrepaymentResponse();
            pr.setId(p.getId()); pr.setPaymentDate(p.getPaymentDate());
            pr.setAmount(p.getAmount()); pr.setInterestAccrued(p.getInterestAccrued());
            return pr;
        }).collect(Collectors.toList()));
        return r;
    }

    private BorrowedLoanSummaryResponse toBorrowedSummary(BorrowedLoan l) {
        BorrowedLoanSummaryResponse r = new BorrowedLoanSummaryResponse();
        r.setId(l.getId()); r.setLoanId(l.getLoanId()); r.setLenderName(l.getLenderName());
        r.setAmountBorrowed(l.getAmountBorrowed()); r.setAmountRepaid(l.getAmountRepaid());
        r.setOutstandingBalance(l.getOutstandingBalance()); r.setDateBorrowed(l.getDateBorrowed());
        r.setStatus(l.getStatus().name()); r.setNotes(l.getNotes());
        return r;
    }

    private BorrowedLoanDetailResponse toBorrowedDetail(BorrowedLoan l) {
        BorrowedLoanDetailResponse r = new BorrowedLoanDetailResponse();
        r.setSummary(toBorrowedSummary(l));
        List<BorrowedRepayment> reps = borrowedRepaymentRepo.findByBorrowedLoanIdOrderByPaymentDateAsc(l.getId());
        r.setRepayments(reps.stream().map(rep -> {
            BorrowedRepaymentResponse rr = new BorrowedRepaymentResponse();
            rr.setId(rep.getId()); rr.setPaymentDate(rep.getPaymentDate());
            rr.setAmount(rep.getAmount()); rr.setNote(rep.getNote());
            return rr;
        }).collect(Collectors.toList()));
        return r;
    }
}
