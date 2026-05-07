package com.omnihub.finance.repository;

import com.omnihub.finance.entity.AnnualLoan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnnualLoanRepository extends JpaRepository<AnnualLoan, Long> {
    List<AnnualLoan> findByUserIdOrderByStartDateDesc(Long userId);
    boolean existsByUserId(Long userId);
}
