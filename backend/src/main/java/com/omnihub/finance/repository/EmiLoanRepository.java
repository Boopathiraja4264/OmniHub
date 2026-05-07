package com.omnihub.finance.repository;

import com.omnihub.finance.entity.EmiLoan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EmiLoanRepository extends JpaRepository<EmiLoan, Long> {
    List<EmiLoan> findByUserIdOrderByStartDateDesc(Long userId);
    boolean existsByUserId(Long userId);
}
