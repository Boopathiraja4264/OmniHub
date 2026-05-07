package com.omnihub.finance.repository;

import com.omnihub.finance.entity.ChitMonthlyEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChitMonthlyEntryRepository extends JpaRepository<ChitMonthlyEntry, Long> {
    List<ChitMonthlyEntry> findByChitBatchIdOrderByMonthNumberAsc(Long chitBatchId);
    Optional<ChitMonthlyEntry> findByChitBatchIdAndMonthNumber(Long chitBatchId, Integer monthNumber);
}
