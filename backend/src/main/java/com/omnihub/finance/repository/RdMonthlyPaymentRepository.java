package com.omnihub.finance.repository;

import com.omnihub.finance.entity.RdMonthlyPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RdMonthlyPaymentRepository extends JpaRepository<RdMonthlyPayment, Long> {
    List<RdMonthlyPayment> findByInvestmentIdOrderByMonthNumberAsc(Long investmentId);
    void deleteByInvestmentId(Long investmentId);
    int countByInvestmentId(Long investmentId);
}
