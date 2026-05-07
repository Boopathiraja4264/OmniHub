package com.omnihub.finance.repository;

import com.omnihub.finance.entity.PrepaymentEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PrepaymentEntryRepository extends JpaRepository<PrepaymentEntry, Long> {
    List<PrepaymentEntry> findByAnnualLoanIdOrderByPaymentDateAsc(Long annualLoanId);
}
