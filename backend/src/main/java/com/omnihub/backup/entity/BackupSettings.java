package com.omnihub.backup.entity;

import com.omnihub.core.entity.User;
import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "backup_settings")
public class BackupSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private boolean enabled = true;
    private LocalTime backupTime = LocalTime.of(0, 0);

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public LocalTime getBackupTime() { return backupTime; }
    public void setBackupTime(LocalTime backupTime) { this.backupTime = backupTime; }
}
