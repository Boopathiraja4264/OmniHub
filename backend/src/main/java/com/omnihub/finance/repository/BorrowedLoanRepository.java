package com.omnihub.finance.repository;

import com.omnihub.finance.entity.BorrowedLoan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BorrowedLoanRepository extends JpaRepository<BorrowedLoan, Long> {
    List<BorrowedLoan> findByUserIdOrderByDateBorrowedDesc(Long userId);
    boolean existsByUserId(Long userId);
}
