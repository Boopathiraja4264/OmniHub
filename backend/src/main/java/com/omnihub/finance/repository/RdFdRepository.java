package com.omnihub.finance.repository;

import com.omnihub.finance.entity.RdFdInvestment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RdFdRepository extends JpaRepository<RdFdInvestment, Long> {
    List<RdFdInvestment> findByUserIdOrderByStartDateDesc(Long userId);
    boolean existsByUserId(Long userId);
}
