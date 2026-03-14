package com.omnihub.backup.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omnihub.backup.entity.BackupLog;
import com.omnihub.backup.repository.BackupLogRepository;
import com.omnihub.finance.entity.Budget;
import com.omnihub.finance.entity.Transaction;
import com.omnihub.finance.repository.BudgetRepository;
import com.omnihub.finance.repository.TransactionRepository;
import com.omnihub.fitness.entity.ExerciseSet;
import com.omnihub.fitness.entity.WeightLog;
import com.omnihub.fitness.entity.WorkoutLog;
import com.omnihub.fitness.repository.WeightLogRepository;
import com.omnihub.fitness.repository.WorkoutLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class OneDriveBackupService {

    @Autowired private OneDriveTokenService tokenService;
    @Autowired private BackupLogRepository backupLogRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private BudgetRepository budgetRepository;
    @Autowired private WorkoutLogRepository workoutLogRepository;
    @Autowired private WeightLogRepository weightLogRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final RestTemplate restTemplate = new RestTemplate();
    private static final String GRAPH_BASE = "https://graph.microsoft.com/v1.0/me/drive/root:/";

    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Kolkata")
    public void scheduledBackup() {
        System.out.println("Starting scheduled OneDrive backup...");
        performBackup();
    }

    @Transactional
    public BackupLog performBackup() {
        BackupLog log = new BackupLog();
        log.setBackedUpAt(LocalDateTime.now(ZoneId.of("Asia/Kolkata")));
        try {
            LocalDate yesterday = LocalDate.now(ZoneId.of("Asia/Kolkata")).minusDays(1);
            String dataDate = yesterday.format(DateTimeFormatter.ofPattern("dd-MMM-yyyy"));
            String fileName = dataDate + ".json";

            List<Transaction> transactions = transactionRepository.findAll();
            List<Budget> budgets = budgetRepository.findAll();
            List<WorkoutLog> workouts = workoutLogRepository.findAll();
            List<WeightLog> weights = weightLogRepository.findAll();

            // Build safe DTOs — no circular refs, no lazy proxies
            List<Map<String, Object>> txDTOs = new ArrayList<>();
            for (Transaction t : transactions) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", t.getId());
                m.put("amount", t.getAmount());
                m.put("description", t.getDescription());
                m.put("category", t.getCategory());
                m.put("type", t.getType());
                m.put("date", t.getDate());
                txDTOs.add(m);
            }

            List<Map<String, Object>> budgetDTOs = new ArrayList<>();
            for (Budget b : budgets) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", b.getId());
                m.put("category", b.getCategory());
                m.put("limitAmount", b.getLimitAmount());
                m.put("monthNumber", b.getMonthNumber());
                m.put("year", b.getYear());
                budgetDTOs.add(m);
            }

            List<Map<String, Object>> workoutDTOs = new ArrayList<>();
            for (WorkoutLog w : workouts) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", w.getId());
                m.put("date", w.getDate());
                m.put("notes", w.getNotes());
                List<Map<String, Object>> sets = new ArrayList<>();
                if (w.getSets() != null) {
                    for (ExerciseSet s : w.getSets()) {
                        Map<String, Object> sm = new LinkedHashMap<>();
                        sm.put("id", s.getId());
                        sm.put("exerciseName", s.getExercise() != null ? s.getExercise().getName() : null);
                        sm.put("sets", s.getSets());
                        sm.put("reps", s.getReps());
                        sm.put("weight", s.getWeight());
                        sets.add(sm);
                    }
                }
                m.put("sets", sets);
                workoutDTOs.add(m);
            }

            List<Map<String, Object>> weightDTOs = new ArrayList<>();
            for (WeightLog wl : weights) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", wl.getId());
                m.put("date", wl.getDate());
                m.put("weight", wl.getWeight());
                m.put("notes", wl.getNotes());
                weightDTOs.add(m);
            }

            Map<String, Object> backupData = new LinkedHashMap<>();
            backupData.put("exportedAt", LocalDateTime.now(ZoneId.of("Asia/Kolkata")).toString());
            backupData.put("dataDate", dataDate);
            backupData.put("transactions", txDTOs);
            backupData.put("budgets", budgetDTOs);
            backupData.put("workoutLogs", workoutDTOs);
            backupData.put("weightLogs", weightDTOs);

            String jsonContent = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(backupData);
            byte[] jsonBytes = jsonContent.getBytes();

            String folderPath = buildFolderPath(yesterday);
            String fullPath = folderPath + fileName;
            String driveUploadPath = GRAPH_BASE + fullPath + ":/content";

            String accessToken = tokenService.getAccessToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<byte[]> request = new HttpEntity<>(jsonBytes, headers);
            ResponseEntity<Map> response = restTemplate.exchange(
                driveUploadPath, HttpMethod.PUT, request, Map.class
            );

            String fileId = (String) response.getBody().get("id");

            log.setFileName(fileName);
            log.setDrivePath(folderPath);
            log.setStatus("SUCCESS");
            log.setFileSizeBytes((long) jsonBytes.length);
            log.setTransactionCount(transactions.size());
            log.setBudgetCount(budgets.size());
            log.setWorkoutCount(workouts.size());
            log.setWeightCount(weights.size());
            log.setDataDate(dataDate);
            log.setDriveFileId(fileId);

            System.out.println("Backup successful: " + fullPath + " (" + jsonBytes.length + " bytes)");

        } catch (Exception e) {
            log.setStatus("FAILED");
            log.setErrorMessage(e.getMessage());
            System.err.println("Backup failed: " + e.getMessage());
        }
        return backupLogRepository.save(log);
    }

    public String downloadBackup(Long backupLogId) {
        BackupLog log = backupLogRepository.findById(backupLogId)
            .orElseThrow(() -> new RuntimeException("Backup log not found"));
        try {
            String accessToken = tokenService.getAccessToken();
            String fullPath = GRAPH_BASE + log.getDrivePath() + log.getFileName() + ":/content";
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(
                fullPath, HttpMethod.GET, request, String.class
            );
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Download failed: " + e.getMessage());
        }
    }

    private String buildFolderPath(LocalDate date) {
        String year = String.valueOf(date.getYear());
        String month = date.format(DateTimeFormatter.ofPattern("MMMM"));
        int week = (int) Math.ceil(date.getDayOfMonth() / 7.0);
        return "OmniHub/" + year + "/" + month + "/Week-" + week + "/";
    }
}
