package com.omnihub.finance.service;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.finance.entity.ChitBatch;
import com.omnihub.finance.entity.ChitGroup;
import com.omnihub.finance.entity.ChitGroup.ChitStatus;
import com.omnihub.finance.entity.ChitMonthlyEntry;
import com.omnihub.finance.repository.ChitBatchRepository;
import com.omnihub.finance.repository.ChitGroupRepository;
import com.omnihub.finance.repository.ChitMonthlyEntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChitService {

    @Autowired private ChitGroupRepository chitGroupRepository;
    @Autowired private ChitBatchRepository chitBatchRepository;
    @Autowired private ChitMonthlyEntryRepository chitMonthlyEntryRepository;
    @Autowired private UserRepository userRepository;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ─── Seed existing data on first startup ──────────────────────────────────

    @Transactional
    public void seedExistingData() {
        for (String email : new String[]{"boopathirajalearning@gmail.com", "boopathigame123@gmail.com"}) {
            userRepository.findByEmail(email).ifPresent(this::seedForUser);
        }
    }

    public void seedForUser(User user) {
        if (chitGroupRepository.existsByUserId(user.getId())) return; // already seeded

            seedGroup(user, "DEC 2025 10000",    "B", 12, 2, 12, 10000, 0.12, 0.01,
                LocalDate.of(2025, 12, 16), ChitStatus.ACTIVE, null,
                new BatchSeed[] {
                    new BatchSeed(LocalDate.of(2026, 4, 14), 110300,
                        new double[]{1100, 1350, 890, 800, 700, 0, 0, 0, 0, 0, 0, 0}),
                    new BatchSeed(null, 0,
                        new double[]{1100, 1350, 890, 800, 700, 0, 0, 0, 0, 0, 0, 0})
                });

            seedGroup(user, "JUNE 2025 50000",   "B", 12, 2, 12, 25000, 0.12, 0.01,
                LocalDate.of(2025, 6, 15), ChitStatus.ACTIVE, null,
                new BatchSeed[] {
                    new BatchSeed(LocalDate.of(2025, 9, 17), 261000,
                        new double[]{0, 2800, 2600, 3000, 1770, 1500, 1260, 1000, 750, 500, 250, 0}),
                    new BatchSeed(LocalDate.of(2025, 10, 18), 275700,
                        new double[]{0, 2800, 2600, 3000, 1770, 1500, 1260, 1000, 750, 500, 250, 0})
                });

            seedGroup(user, "JUNE 2025 10000",   "C", 12, 1, 12, 10000, 0.12, 0.01,
                LocalDate.of(2025, 6, 15), ChitStatus.ACTIVE, null,
                new BatchSeed[] {
                    new BatchSeed(LocalDate.of(2025, 10, 18), 110300,
                        new double[]{0, 1100, 1060, 1150, 710, 730, 570, 580, 480, 200, 110, 0})
                });

            seedGroup(user, "MARCH 2025 (VAALAPAADI) 5000", "A", 20, 1, 20, 5000, 0.12, 0.04,
                LocalDate.of(2025, 3, 20), ChitStatus.ACTIVE, "Vaalapaadi",
                new BatchSeed[] {
                    new BatchSeed(LocalDate.of(2025, 9, 20), 75000,
                        new double[]{1450, 1350, 1300, 1200, 1150, 1100, 1050, 1000, 900, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0})
                });

            seedGroup(user, "AUG 2023 10000",    "D", 12, 2, 12, 10000, 0.12, 0.01,
                LocalDate.of(2023, 8, 18), ChitStatus.COMPLETED, null,
                new BatchSeed[] {
                    new BatchSeed(LocalDate.of(2024, 2, 11), 111500,
                        new double[]{2300, 1240, 1260, 990, 900, 920, 600, 410, 0, 0, 0, 0}),
                    new BatchSeed(null, 113900,
                        new double[]{2300, 1240, 1260, 990, 900, 920, 600, 410, 0, 0, 0, 0})
                });

            seedGroup(user, "OCT 2023 25000",    "F", 20, 2, 10, 25000, 0.10, 0.01,
                LocalDate.of(2023, 10, 18), ChitStatus.COMPLETED, null,
                new BatchSeed[] {
                    new BatchSeed(LocalDate.of(2024, 1, 15), 231500,
                        new double[]{3950, 0, 1900, 1620, 1730, 1000, 0, 0, 0, 0})
                });

            seedGroup(user, "JAN 2023 10000",    "J", 12, 1, 12, 10000, 0.12, 0.01,
                LocalDate.of(2023, 1, 15), ChitStatus.COMPLETED, null,
                new BatchSeed[] {
                    new BatchSeed(LocalDate.of(2023, 2, 11), 102000,
                        new double[]{1570, 1400, 1330, 0, 0, 0, 0, 0, 0, 0, 0, 0})
                });
    }

    private static class BatchSeed {
        LocalDate dateTaken;
        double amountTaken;
        double[] kasir; // one per month, 0 = not entered

        BatchSeed(LocalDate dateTaken, double amountTaken, double[] kasir) {
            this.dateTaken = dateTaken;
            this.amountTaken = amountTaken;
            this.kasir = kasir;
        }
    }

    private void seedGroup(User user, String name, String groupLabel,
            int membersCount, int totalBatches, int membersPerBatch,
            double monthlyAmtD, double interestD, double commissionD,
            LocalDate startDate, ChitStatus status, String notes,
            BatchSeed[] batchSeeds) {

        ChitGroup group = new ChitGroup();
        group.setUser(user);
        group.setName(name);
        group.setGroupLabel(groupLabel);
        group.setMembersCount(membersCount);
        group.setTotalBatches(totalBatches);
        group.setMembersPerBatch(membersPerBatch);
        group.setMonthlyAmount(BigDecimal.valueOf(monthlyAmtD));
        group.setBasicInterest(interestD > 0 ? BigDecimal.valueOf(interestD) : null);
        group.setCompanyCommission(commissionD > 0 ? BigDecimal.valueOf(commissionD) : null);
        group.setStartDate(startDate);
        group.setStatus(status);
        group.setNotes(notes);
        chitGroupRepository.save(group);

        BigDecimal monthly = BigDecimal.valueOf(monthlyAmtD);
        BigDecimal totalAmount = monthly.multiply(BigDecimal.valueOf(membersPerBatch));
        BigDecimal interest = interestD > 0 ? BigDecimal.valueOf(interestD) : BigDecimal.ZERO;
        BigDecimal commission = commissionD > 0 ? BigDecimal.valueOf(commissionD) : BigDecimal.ZERO;

        for (int b = 0; b < batchSeeds.length; b++) {
            BatchSeed seed = batchSeeds[b];
            ChitBatch batch = new ChitBatch();
            batch.setChitGroup(group);
            batch.setBatchNumber(b + 1);
            batch.setDateTaken(seed.dateTaken);
            batch.setAmountTaken(seed.amountTaken > 0 ? BigDecimal.valueOf(seed.amountTaken) : null);
            chitBatchRepository.save(batch);

            int numMonths = seed.kasir.length;
            for (int m = 0; m < numMonths; m++) {
                int monthNo = m + 1;
                LocalDate monthDate = startDate.plusMonths(m);

                BigDecimal companyYelam = BigDecimal.ZERO;
                if (interest.compareTo(BigDecimal.ZERO) > 0) {
                    // (totalAmount - (monthNo-1) * monthly) * interest
                    BigDecimal remaining = totalAmount.subtract(monthly.multiply(BigDecimal.valueOf(monthNo - 1)));
                    companyYelam = remaining.multiply(interest).setScale(2, RoundingMode.HALF_UP);
                }

                BigDecimal kasir = seed.kasir[m] > 0 ? BigDecimal.valueOf(seed.kasir[m]) : null;
                BigDecimal thalli = null;
                if (kasir != null && commission.compareTo(BigDecimal.ZERO) > 0) {
                    // kasir * membersPerBatch + totalAmount * commission
                    thalli = kasir.multiply(BigDecimal.valueOf(membersPerBatch))
                            .add(totalAmount.multiply(commission))
                            .setScale(2, RoundingMode.HALF_UP);
                }

                ChitMonthlyEntry entry = new ChitMonthlyEntry();
                entry.setChitBatch(batch);
                entry.setMonthNumber(monthNo);
                entry.setMonthDate(monthDate);
                entry.setAmountPerMonth(monthly);
                entry.setKasirPerMonth(kasir);
                entry.setCompanyYelam(companyYelam.compareTo(BigDecimal.ZERO) > 0 ? companyYelam : null);
                entry.setThalliEduthathu(thalli);
                chitMonthlyEntryRepository.save(entry);
            }
        }
    }

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    @Transactional
    public ChitGroupResponse create(String email, ChitGroupRequest req) {
        User user = getUser(email);
        ChitGroup group = new ChitGroup();
        group.setUser(user);
        applyGroupFields(group, req);
        chitGroupRepository.save(group);

        // Create empty batch stubs + monthly entries
        for (int b = 1; b <= req.getTotalBatches(); b++) {
            ChitBatch batch = new ChitBatch();
            batch.setChitGroup(group);
            batch.setBatchNumber(b);
            chitBatchRepository.save(batch);

            int numMonths = req.getMembersPerBatch();
            BigDecimal monthly = req.getMonthlyAmount();
            BigDecimal totalAmount = monthly.multiply(BigDecimal.valueOf(req.getMembersPerBatch()));
            BigDecimal interest = req.getBasicInterest() != null ? req.getBasicInterest() : BigDecimal.ZERO;
            BigDecimal commission = req.getCompanyCommission() != null ? req.getCompanyCommission() : BigDecimal.ZERO;

            for (int m = 1; m <= numMonths; m++) {
                LocalDate monthDate = req.getStartDate().plusMonths(m - 1);
                BigDecimal companyYelam = null;
                if (interest.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal remaining = totalAmount.subtract(monthly.multiply(BigDecimal.valueOf(m - 1)));
                    companyYelam = remaining.multiply(interest).setScale(2, RoundingMode.HALF_UP);
                }
                ChitMonthlyEntry entry = new ChitMonthlyEntry();
                entry.setChitBatch(batch);
                entry.setMonthNumber(m);
                entry.setMonthDate(monthDate);
                entry.setAmountPerMonth(monthly);
                entry.setCompanyYelam(companyYelam);
                chitMonthlyEntryRepository.save(entry);
            }
        }

        return toGroupResponse(chitGroupRepository.findById(group.getId()).orElseThrow());
    }

    @Transactional(readOnly = true)
    public List<ChitGroupResponse> getAll(String email) {
        User user = getUser(email);
        return chitGroupRepository.findByUserIdOrderByStartDateDesc(user.getId())
                .stream().map(this::toGroupResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ChitGroupResponse getById(String email, Long id) {
        User user = getUser(email);
        ChitGroup group = chitGroupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Chit group not found"));
        if (!group.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        return toGroupResponse(group);
    }

    @Transactional
    public ChitGroupResponse update(String email, Long id, ChitGroupRequest req) {
        User user = getUser(email);
        ChitGroup group = chitGroupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Chit group not found"));
        if (!group.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");

        int oldBatches        = group.getTotalBatches();
        int newBatches        = req.getTotalBatches();
        LocalDate oldStart    = group.getStartDate();
        int oldMembersPerBatch = group.getMembersPerBatch();
        BigDecimal oldMonthly    = group.getMonthlyAmount();
        BigDecimal oldInterest   = group.getBasicInterest();
        BigDecimal oldCommission = group.getCompanyCommission();

        applyGroupFields(group, req);
        group = chitGroupRepository.save(group);

        LocalDate newStart    = req.getStartDate();
        int newMembersPerBatch = req.getMembersPerBatch();
        boolean startChanged  = !newStart.equals(oldStart);
        boolean tenureChanged = newMembersPerBatch != oldMembersPerBatch;

        BigDecimal monthly    = req.getMonthlyAmount();
        BigDecimal totalAmt   = monthly.multiply(BigDecimal.valueOf(newMembersPerBatch));
        BigDecimal interest   = req.getBasicInterest() != null ? req.getBasicInterest() : BigDecimal.ZERO;
        BigDecimal commission = req.getCompanyCommission() != null ? req.getCompanyCommission() : BigDecimal.ZERO;

        // companyYelam depends on monthly+interest, thalli on monthly+commission — so any of
        // these changing (not just start/tenure) must recompute the existing entries.
        boolean derivedChanged = differs(oldMonthly, req.getMonthlyAmount())
                || differs(oldInterest, req.getBasicInterest())
                || differs(oldCommission, req.getCompanyCommission());

        // Update monthly entries for ALL existing batches when any derived input changed
        if (startChanged || tenureChanged || derivedChanged) {
            List<ChitBatch> existingBatches = chitBatchRepository
                    .findByChitGroupIdOrderByBatchNumberAsc(group.getId());
            for (ChitBatch batch : existingBatches) {
                List<ChitMonthlyEntry> entries = chitMonthlyEntryRepository
                        .findByChitBatchIdOrderByMonthNumberAsc(batch.getId());

                // Update dates for existing entries
                for (ChitMonthlyEntry entry : entries) {
                    if (entry.getMonthNumber() <= newMembersPerBatch) {
                        LocalDate newDate = newStart.plusMonths(entry.getMonthNumber() - 1);
                        entry.setMonthDate(newDate);
                        entry.setAmountPerMonth(monthly);
                        // Recompute companyYelam (clear it when interest is removed)
                        if (interest.compareTo(BigDecimal.ZERO) > 0) {
                            BigDecimal remaining = totalAmt.subtract(monthly.multiply(BigDecimal.valueOf(entry.getMonthNumber() - 1)));
                            entry.setCompanyYelam(remaining.multiply(interest).setScale(2, RoundingMode.HALF_UP));
                        } else {
                            entry.setCompanyYelam(null);
                        }
                        // Recompute thalliEduthathu (kasir * membersPerBatch + totalAmt * commission)
                        if (entry.getKasirPerMonth() != null && commission.compareTo(BigDecimal.ZERO) > 0) {
                            entry.setThalliEduthathu(entry.getKasirPerMonth()
                                    .multiply(BigDecimal.valueOf(newMembersPerBatch))
                                    .add(totalAmt.multiply(commission))
                                    .setScale(2, RoundingMode.HALF_UP));
                        } else {
                            entry.setThalliEduthathu(null);
                        }
                        chitMonthlyEntryRepository.save(entry);
                    } else {
                        // Tenure shortened — remove extra entries
                        chitMonthlyEntryRepository.delete(entry);
                    }
                }

                // Tenure extended — add new entries beyond old range
                if (newMembersPerBatch > oldMembersPerBatch) {
                    for (int m = oldMembersPerBatch + 1; m <= newMembersPerBatch; m++) {
                        LocalDate monthDate = newStart.plusMonths(m - 1);
                        BigDecimal companyYelam = null;
                        if (interest.compareTo(BigDecimal.ZERO) > 0) {
                            BigDecimal remaining = totalAmt.subtract(monthly.multiply(BigDecimal.valueOf(m - 1)));
                            companyYelam = remaining.multiply(interest).setScale(2, RoundingMode.HALF_UP);
                        }
                        ChitMonthlyEntry entry = new ChitMonthlyEntry();
                        entry.setChitBatch(batch);
                        entry.setMonthNumber(m);
                        entry.setMonthDate(monthDate);
                        entry.setAmountPerMonth(monthly);
                        entry.setCompanyYelam(companyYelam);
                        chitMonthlyEntryRepository.save(entry);
                    }
                }
            }
        }

        // Remove extra batches when count decreases (cascade deletes their monthly entries)
        if (newBatches < oldBatches) {
            List<ChitBatch> allBatches = chitBatchRepository
                    .findByChitGroupIdOrderByBatchNumberAsc(group.getId());
            for (ChitBatch batch : allBatches) {
                if (batch.getBatchNumber() > newBatches) {
                    chitBatchRepository.delete(batch);
                }
            }
        }

        // Create batch records for any newly added batches
        if (newBatches > oldBatches) {
            for (int b = oldBatches + 1; b <= newBatches; b++) {
                ChitBatch batch = new ChitBatch();
                batch.setChitGroup(group);
                batch.setBatchNumber(b);
                chitBatchRepository.save(batch);

                for (int m = 1; m <= newMembersPerBatch; m++) {
                    LocalDate monthDate = newStart.plusMonths(m - 1);
                    BigDecimal companyYelam = null;
                    if (interest.compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal remaining = totalAmt.subtract(monthly.multiply(BigDecimal.valueOf(m - 1)));
                        companyYelam = remaining.multiply(interest).setScale(2, RoundingMode.HALF_UP);
                    }
                    ChitMonthlyEntry entry = new ChitMonthlyEntry();
                    entry.setChitBatch(batch);
                    entry.setMonthNumber(m);
                    entry.setMonthDate(monthDate);
                    entry.setAmountPerMonth(monthly);
                    entry.setCompanyYelam(companyYelam);
                    chitMonthlyEntryRepository.save(entry);
                }
            }
        }

        return toGroupResponse(chitGroupRepository.findById(group.getId()).orElseThrow());
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = getUser(email);
        ChitGroup group = chitGroupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Chit group not found"));
        if (!group.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        chitGroupRepository.delete(group);
    }

    @Transactional
    public ChitBatchResponse updateBatch(String email, Long batchId, ChitBatchUpdateRequest req) {
        ChitBatch batch = chitBatchRepository.findById(batchId)
                .orElseThrow(() -> new RuntimeException("Batch not found"));
        User user = getUser(email);
        if (!batch.getChitGroup().getUser().getId().equals(user.getId()))
            throw new RuntimeException("Unauthorized");
        batch.setDateTaken(req.getDateTaken());
        batch.setAmountTaken(req.getAmountTaken());
        chitBatchRepository.save(batch);
        return toBatchResponse(batch);
    }

    @Transactional
    public ChitMonthlyEntryResponse updateKasir(String email, Long entryId, ChitKasirUpdateRequest req) {
        ChitMonthlyEntry entry = chitMonthlyEntryRepository.findById(entryId)
                .orElseThrow(() -> new RuntimeException("Entry not found"));
        User user = getUser(email);
        ChitGroup group = entry.getChitBatch().getChitGroup();
        if (!group.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");

        entry.setKasirPerMonth(req.getKasirPerMonth());

        // Recompute thalliEduthathu
        if (req.getKasirPerMonth() != null && group.getCompanyCommission() != null) {
            BigDecimal totalAmount = group.getMonthlyAmount()
                    .multiply(BigDecimal.valueOf(group.getMembersPerBatch()));
            BigDecimal thalli = req.getKasirPerMonth()
                    .multiply(BigDecimal.valueOf(group.getMembersPerBatch()))
                    .add(totalAmount.multiply(group.getCompanyCommission()))
                    .setScale(2, RoundingMode.HALF_UP);
            entry.setThalliEduthathu(thalli);
        } else {
            entry.setThalliEduthathu(null);
        }

        chitMonthlyEntryRepository.save(entry);
        return toEntryResponse(entry);
    }

    @Transactional
    public ChitMonthlyEntryResponse updatePayment(String email, Long entryId, ChitPaymentUpdateRequest req) {
        ChitMonthlyEntry entry = chitMonthlyEntryRepository.findById(entryId)
                .orElseThrow(() -> new RuntimeException("Entry not found"));
        User user = getUser(email);
        ChitGroup group = entry.getChitBatch().getChitGroup();
        if (!group.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");

        entry.setPaid(req.isPaid());
        if (req.isPaid()) {
            entry.setPaidDate(req.getPaidDate());
            entry.setPaidBankAccountId(req.getPaidBankAccountId());
            entry.setPaidTransactionId(req.getPaidTransactionId());
        } else {
            entry.setPaidDate(null);
            entry.setPaidBankAccountId(null);
            entry.setPaidTransactionId(null);
        }

        chitMonthlyEntryRepository.save(entry);
        return toEntryResponse(entry);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    // Scale-insensitive BigDecimal comparison (1.0 vs 1.00 are equal); null-safe.
    private static boolean differs(BigDecimal a, BigDecimal b) {
        if (a == null && b == null) return false;
        if (a == null || b == null) return true;
        return a.compareTo(b) != 0;
    }

    private void applyGroupFields(ChitGroup group, ChitGroupRequest req) {
        group.setName(req.getName());
        group.setGroupLabel(req.getGroupLabel());
        group.setMembersCount(req.getMembersCount());
        group.setTotalBatches(req.getTotalBatches());
        group.setMembersPerBatch(req.getMembersPerBatch());
        group.setMonthlyAmount(req.getMonthlyAmount());
        group.setBasicInterest(req.getBasicInterest());
        group.setCompanyCommission(req.getCompanyCommission());
        group.setStartDate(req.getStartDate());
        group.setStatus(req.getStatus() != null
                ? ChitStatus.valueOf(req.getStatus()) : ChitStatus.ACTIVE);
        group.setNotes(req.getNotes());
    }

    private ChitGroupResponse toGroupResponse(ChitGroup group) {
        ChitGroupResponse r = new ChitGroupResponse();
        r.setId(group.getId());
        r.setName(group.getName());
        r.setGroupLabel(group.getGroupLabel());
        r.setMembersCount(group.getMembersCount());
        r.setTotalBatches(group.getTotalBatches());
        r.setMembersPerBatch(group.getMembersPerBatch());
        r.setMonthlyAmount(group.getMonthlyAmount());
        r.setBasicInterest(group.getBasicInterest());
        r.setCompanyCommission(group.getCompanyCommission());
        r.setStartDate(group.getStartDate());
        r.setStatus(group.getStatus().name());
        r.setNotes(group.getNotes());

        BigDecimal totalAmount = group.getMonthlyAmount()
                .multiply(BigDecimal.valueOf(group.getMembersPerBatch()));
        r.setTotalAmount(totalAmount);

        List<ChitBatch> batches = chitBatchRepository.findByChitGroupIdOrderByBatchNumberAsc(group.getId());
        BigDecimal totalReceived = BigDecimal.ZERO;
        BigDecimal totalKasir = BigDecimal.ZERO;
        List<ChitBatchResponse> batchResponses = new ArrayList<>();
        for (ChitBatch batch : batches) {
            if (batch.getAmountTaken() != null)
                totalReceived = totalReceived.add(batch.getAmountTaken());
            List<ChitMonthlyEntry> batchEntries = chitMonthlyEntryRepository
                    .findByChitBatchIdOrderByMonthNumberAsc(batch.getId());
            for (ChitMonthlyEntry e : batchEntries) {
                if (e.getKasirPerMonth() != null)
                    totalKasir = totalKasir.add(e.getKasirPerMonth());
            }
            batchResponses.add(toBatchResponse(batch));
        }
        r.setBatches(batchResponses);
        r.setTotalReceived(totalReceived);
        r.setTotalKasir(totalKasir);

        // totalPaid = sum of amountPerMonth across all entries of batch 1 that have a monthDate <= today
        BigDecimal totalPaid = BigDecimal.ZERO;
        if (!batches.isEmpty()) {
            List<ChitMonthlyEntry> entries = chitMonthlyEntryRepository
                    .findByChitBatchIdOrderByMonthNumberAsc(batches.get(0).getId());
            LocalDate today = LocalDate.now();
            for (ChitMonthlyEntry e : entries) {
                if (!e.getMonthDate().isAfter(today)) totalPaid = totalPaid.add(e.getAmountPerMonth());
            }
            // Multiply by totalBatches (user pays for each batch)
            totalPaid = totalPaid.multiply(BigDecimal.valueOf(group.getTotalBatches()));
        }
        r.setTotalPaid(totalPaid);

        return r;
    }

    private ChitBatchResponse toBatchResponse(ChitBatch batch) {
        ChitBatchResponse r = new ChitBatchResponse();
        r.setId(batch.getId());
        r.setBatchNumber(batch.getBatchNumber());
        r.setDateTaken(batch.getDateTaken());
        r.setAmountTaken(batch.getAmountTaken());
        List<ChitMonthlyEntry> entries = chitMonthlyEntryRepository
                .findByChitBatchIdOrderByMonthNumberAsc(batch.getId());
        r.setMonthlyEntries(entries.stream().map(this::toEntryResponse).collect(Collectors.toList()));
        return r;
    }

    private ChitMonthlyEntryResponse toEntryResponse(ChitMonthlyEntry e) {
        ChitMonthlyEntryResponse r = new ChitMonthlyEntryResponse();
        r.setId(e.getId());
        r.setMonthNumber(e.getMonthNumber());
        r.setMonthDate(e.getMonthDate());
        r.setAmountPerMonth(e.getAmountPerMonth());
        r.setKasirPerMonth(e.getKasirPerMonth());
        r.setCompanyYelam(e.getCompanyYelam());
        r.setThalliEduthathu(e.getThalliEduthathu());
        r.setPaid(e.isPaid());
        r.setPaidDate(e.getPaidDate());
        r.setPaidBankAccountId(e.getPaidBankAccountId());
        r.setPaidTransactionId(e.getPaidTransactionId());
        return r;
    }
}
