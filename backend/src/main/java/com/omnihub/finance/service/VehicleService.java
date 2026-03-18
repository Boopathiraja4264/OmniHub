package com.omnihub.finance.service;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.finance.entity.Vehicle;
import com.omnihub.finance.entity.VehicleLog;
import com.omnihub.finance.repository.VehicleLogRepository;
import com.omnihub.finance.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class VehicleService {

    @Autowired private VehicleRepository vehicleRepo;
    @Autowired private VehicleLogRepository logRepo;
    @Autowired private UserRepository userRepo;

    private User getUser(String email) {
        return userRepo.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> getAll(String email) {
        User user = getUser(email);
        return vehicleRepo.findByUserIdOrderByNameAsc(user.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public VehicleResponse create(String email, VehicleRequest req) {
        User user = getUser(email);
        Vehicle v = new Vehicle();
        v.setName(req.getName());
        v.setType(req.getType());
        if (req.getServiceIntervalKm() != null) v.setServiceIntervalKm(req.getServiceIntervalKm());
        v.setUser(user);
        return toResponse(vehicleRepo.save(v));
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = getUser(email);
        Vehicle v = vehicleRepo.findById(id).orElseThrow(() -> new RuntimeException("Vehicle not found"));
        if (!v.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        vehicleRepo.delete(v);
    }

    @Transactional(readOnly = true)
    public List<VehicleLogResponse> getLogs(String email, Long vehicleId) {
        User user = getUser(email);
        List<VehicleLog> logs = vehicleId != null
                ? logRepo.findByUserIdAndVehicleIdOrderByDateDesc(user.getId(), vehicleId)
                : logRepo.findByUserIdOrderByDateDesc(user.getId());
        java.util.Map<Long, String> nameMap = vehicleRepo.findByUserIdOrderByNameAsc(user.getId())
                .stream().collect(Collectors.toMap(Vehicle::getId, Vehicle::getName));
        return logs.stream().map(l -> toLogResponse(l, nameMap.getOrDefault(l.getVehicleId(), "Unknown")))
                .collect(Collectors.toList());
    }

    @Transactional
    public VehicleLogResponse addLog(String email, VehicleLogRequest req) {
        User user = getUser(email);
        Vehicle v = vehicleRepo.findById(req.getVehicleId())
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        if (!v.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        VehicleLog log = new VehicleLog();
        log.setVehicleId(req.getVehicleId());
        log.setDate(req.getDate());
        log.setKmAtService(req.getKmAtService());
        log.setServiceType(req.getServiceType());
        log.setCost(req.getCost());
        log.setNextServiceKm(req.getKmAtService() + v.getServiceIntervalKm());
        log.setNotes(req.getNotes());
        log.setUser(user);
        return toLogResponse(logRepo.save(log), v.getName());
    }

    @Transactional
    public void deleteLog(String email, Long id) {
        User user = getUser(email);
        VehicleLog log = logRepo.findById(id).orElseThrow(() -> new RuntimeException("Log not found"));
        if (!log.getUser().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        logRepo.delete(log);
    }

    @Transactional
    public void autoLog(User user, Long vehicleId, Integer km, java.math.BigDecimal cost,
                        Long expenseId, java.time.LocalDate date, String notes) {
        vehicleRepo.findById(vehicleId).ifPresent(v -> {
            if (!v.getUser().getId().equals(user.getId())) return;
            VehicleLog log = new VehicleLog();
            log.setVehicleId(vehicleId);
            log.setExpenseId(expenseId);
            log.setDate(date);
            log.setKmAtService(km);
            log.setServiceType("Fuel/Service");
            log.setCost(cost);
            log.setNextServiceKm(km + v.getServiceIntervalKm());
            log.setNotes(notes);
            log.setUser(user);
            logRepo.save(log);
        });
    }

    private VehicleResponse toResponse(Vehicle v) {
        VehicleResponse r = new VehicleResponse();
        r.setId(v.getId());
        r.setName(v.getName());
        r.setType(v.getType());
        r.setServiceIntervalKm(v.getServiceIntervalKm());
        return r;
    }

    private VehicleLogResponse toLogResponse(VehicleLog l, String vehicleName) {
        VehicleLogResponse r = new VehicleLogResponse();
        r.setId(l.getId());
        r.setVehicleId(l.getVehicleId());
        r.setVehicleName(vehicleName);
        r.setDate(l.getDate());
        r.setKmAtService(l.getKmAtService());
        r.setNextServiceKm(l.getNextServiceKm());
        r.setServiceType(l.getServiceType());
        r.setCost(l.getCost());
        r.setNotes(l.getNotes());
        return r;
    }
}
