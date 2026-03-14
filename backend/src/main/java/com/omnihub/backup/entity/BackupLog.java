package com.omnihub.backup.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "backup_logs")
public class BackupLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;
    private String drivePath;
    private String status;
    @Column(columnDefinition = "TEXT")
    private String errorMessage;
    private Long fileSizeBytes;
    private int transactionCount;
    private int budgetCount;
    private int workoutCount;
    private int weightCount;
    private LocalDateTime backedUpAt;
    private String dataDate;

    @Column(columnDefinition = "TEXT")
    private String driveFileId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getDrivePath() { return drivePath; }
    public void setDrivePath(String drivePath) { this.drivePath = drivePath; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public Long getFileSizeBytes() { return fileSizeBytes; }
    public void setFileSizeBytes(Long fileSizeBytes) { this.fileSizeBytes = fileSizeBytes; }
    public int getTransactionCount() { return transactionCount; }
    public void setTransactionCount(int t) { this.transactionCount = t; }
    public int getBudgetCount() { return budgetCount; }
    public void setBudgetCount(int b) { this.budgetCount = b; }
    public int getWorkoutCount() { return workoutCount; }
    public void setWorkoutCount(int w) { this.workoutCount = w; }
    public int getWeightCount() { return weightCount; }
    public void setWeightCount(int w) { this.weightCount = w; }
    public LocalDateTime getBackedUpAt() { return backedUpAt; }
    public void setBackedUpAt(LocalDateTime t) { this.backedUpAt = t; }
    public String getDataDate() { return dataDate; }
    public void setDataDate(String d) { this.dataDate = d; }
    public String getDriveFileId() { return driveFileId; }
    public void setDriveFileId(String d) { this.driveFileId = d; }
}
