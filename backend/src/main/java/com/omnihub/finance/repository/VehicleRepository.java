package com.omnihub.finance.repository;
import com.omnihub.finance.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByUserIdOrderByNameAsc(Long userId);
}
