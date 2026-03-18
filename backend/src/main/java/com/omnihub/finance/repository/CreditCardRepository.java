package com.omnihub.finance.repository;
import com.omnihub.finance.entity.CreditCard;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CreditCardRepository extends JpaRepository<CreditCard, Long> {
    List<CreditCard> findByUserIdOrderByNameAsc(Long userId);
}
