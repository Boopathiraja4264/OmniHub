package com.omnihub.core.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;
    @Column(nullable = false)
    private String password;
    @Column(nullable = false)
    private String fullName;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column
    private Double heightCm;
    @Column
    private Double goalWeight;
    @Column
    private Double weeklyLossRate;
    @Column
    private Double startWeight;
    @Column
    private String scheduleStartDate;
    @Column
    private Double scheduleStartWeight;

    // ── Auth & Security ──────────────────────────────────────────────────────
    @Column(nullable = false)
    private boolean emailVerified = false;

    // TOTP 2FA
    @Column
    private String totpSecret;
    @Column(nullable = false)
    private boolean totpEnabled = false;

    // 2FA method: NONE, TOTP, EMAIL_OTP, SMS_OTP, PUSH
    @Column(length = 20)
    private String twoFactorMethod = "NONE";

    // TOTP backup codes (semicolon-delimited BCrypt hashes)
    @Column(length = 2000)
    private String totpBackupCodes;

    // Password reset
    @Column
    private String passwordResetToken;
    @Column
    private LocalDateTime passwordResetTokenExpiry;

    // OAuth2 SSO
    @Column
    private String oauthProvider;
    @Column
    private String oauthProviderId;

    // Push notification approval token (login challenge token, for push 2FA)
    @Column
    private String pendingPushChallengeToken;
    @Column
    private String pushChallengeStatus; // PENDING, APPROVED, DENIED

    public User() {
    }

    public static UserBuilder builder() {
        return new UserBuilder();
    }

    public static class UserBuilder {
        private String email, password, fullName;
        private Double heightCm, goalWeight, weeklyLossRate, startWeight;
        private String oauthProvider, oauthProviderId;
        private boolean emailVerified = false;

        public UserBuilder heightCm(Double v) { this.heightCm = v; return this; }
        public UserBuilder goalWeight(Double v) { this.goalWeight = v; return this; }
        public UserBuilder weeklyLossRate(Double v) { this.weeklyLossRate = v; return this; }
        public UserBuilder startWeight(Double v) { this.startWeight = v; return this; }
        public UserBuilder email(String v) { this.email = v; return this; }
        public UserBuilder password(String v) { this.password = v; return this; }
        public UserBuilder fullName(String v) { this.fullName = v; return this; }
        public UserBuilder oauthProvider(String v) { this.oauthProvider = v; return this; }
        public UserBuilder oauthProviderId(String v) { this.oauthProviderId = v; return this; }
        public UserBuilder emailVerified(boolean v) { this.emailVerified = v; return this; }

        public User build() {
            User u = new User();
            u.heightCm = heightCm;
            u.goalWeight = goalWeight;
            u.weeklyLossRate = weeklyLossRate;
            u.startWeight = startWeight;
            u.email = email;
            u.password = password;
            u.fullName = fullName;
            u.oauthProvider = oauthProvider;
            u.oauthProviderId = oauthProviderId;
            u.emailVerified = emailVerified;
            return u;
        }
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public void setEmail(String v) { email = v; }
    public String getPassword() { return password; }
    public void setPassword(String v) { password = v; }
    public String getFullName() { return fullName; }
    public void setFullName(String v) { fullName = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public Double getHeightCm() { return heightCm; }
    public void setHeightCm(Double v) { heightCm = v; }
    public Double getGoalWeight() { return goalWeight; }
    public void setGoalWeight(Double v) { goalWeight = v; }
    public Double getWeeklyLossRate() { return weeklyLossRate; }
    public void setWeeklyLossRate(Double v) { weeklyLossRate = v; }
    public Double getStartWeight() { return startWeight; }
    public void setStartWeight(Double v) { startWeight = v; }
    public String getScheduleStartDate() { return scheduleStartDate; }
    public void setScheduleStartDate(String v) { scheduleStartDate = v; }
    public Double getScheduleStartWeight() { return scheduleStartWeight; }
    public void setScheduleStartWeight(Double v) { scheduleStartWeight = v; }

    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean v) { emailVerified = v; }
    public String getTotpSecret() { return totpSecret; }
    public void setTotpSecret(String v) { totpSecret = v; }
    public boolean isTotpEnabled() { return totpEnabled; }
    public void setTotpEnabled(boolean v) { totpEnabled = v; }
    public String getTwoFactorMethod() { return twoFactorMethod; }
    public void setTwoFactorMethod(String v) { twoFactorMethod = v; }
    public String getTotpBackupCodes() { return totpBackupCodes; }
    public void setTotpBackupCodes(String v) { totpBackupCodes = v; }
    public String getPasswordResetToken() { return passwordResetToken; }
    public void setPasswordResetToken(String v) { passwordResetToken = v; }
    public LocalDateTime getPasswordResetTokenExpiry() { return passwordResetTokenExpiry; }
    public void setPasswordResetTokenExpiry(LocalDateTime v) { passwordResetTokenExpiry = v; }
    public String getOauthProvider() { return oauthProvider; }
    public void setOauthProvider(String v) { oauthProvider = v; }
    public String getOauthProviderId() { return oauthProviderId; }
    public void setOauthProviderId(String v) { oauthProviderId = v; }
    public String getPendingPushChallengeToken() { return pendingPushChallengeToken; }
    public void setPendingPushChallengeToken(String v) { pendingPushChallengeToken = v; }
    public String getPushChallengeStatus() { return pushChallengeStatus; }
    public void setPushChallengeStatus(String v) { pushChallengeStatus = v; }
}
