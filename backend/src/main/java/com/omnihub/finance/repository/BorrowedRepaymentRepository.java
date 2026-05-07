package com.omnihub.finance.repository;

import com.omnihub.finance.entity.BorrowedRepayment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BorrowedRepaymentRepository extends JpaRepository<BorrowedRepayment, Long> {
    List<BorrowedRepayment> findByBorrowedLoanIdOrderByPaymentDateAsc(Long borrowedLoanId);
}
