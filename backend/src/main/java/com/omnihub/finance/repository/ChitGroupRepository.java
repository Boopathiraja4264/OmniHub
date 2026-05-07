package com.omnihub.finance.repository;

import com.omnihub.finance.entity.ChitGroup;
import com.omnihub.finance.entity.ChitGroup.ChitStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChitGroupRepository extends JpaRepository<ChitGroup, Long> {
    List<ChitGroup> findByUserIdOrderByStartDateDesc(Long userId);
    List<ChitGroup> findByUserIdAndStatusOrderByStartDateDesc(Long userId, ChitStatus status);
    boolean existsByUserId(Long userId);
}
