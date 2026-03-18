package com.omnihub.finance.repository;

import com.omnihub.finance.entity.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {
    List<BankAccount> findByUserIdOrderByNameAsc(Long userId);
    Optional<BankAccount> findByUserIdAndIsDefaultTrue(Long userId);

    @Query("SELECT b FROM BankAccount b WHERE b.id = :id AND b.user.id = :userId")
    Optional<BankAccount> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    @Modifying
    @Transactional
    @Query("UPDATE BankAccount b SET b.isDefault = false WHERE b.user.id = :userId")
    void clearDefaultForUser(@Param("userId") Long userId);
}
