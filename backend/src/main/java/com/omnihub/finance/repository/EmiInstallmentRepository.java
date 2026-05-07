package com.omnihub.finance.repository;

import com.omnihub.finance.entity.EmiInstallment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EmiInstallmentRepository extends JpaRepository<EmiInstallment, Long> {
    List<EmiInstallment> findByEmiLoanIdOrderByInstallmentNumberAsc(Long emiLoanId);
}
