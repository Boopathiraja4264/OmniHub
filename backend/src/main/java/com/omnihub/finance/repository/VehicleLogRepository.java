package com.omnihub.finance.repository;
import com.omnihub.finance.entity.VehicleLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface VehicleLogRepository extends JpaRepository<VehicleLog, Long> {
    List<VehicleLog> findByUserIdAndVehicleIdOrderByDateDesc(Long userId, Long vehicleId);
    List<VehicleLog> findByUserIdOrderByDateDesc(Long userId);
}
