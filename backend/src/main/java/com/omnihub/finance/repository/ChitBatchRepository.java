package com.omnihub.finance.repository;

import com.omnihub.finance.entity.ChitBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChitBatchRepository extends JpaRepository<ChitBatch, Long> {
    List<ChitBatch> findByChitGroupIdOrderByBatchNumberAsc(Long chitGroupId);
}
