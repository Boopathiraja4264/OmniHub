package com.omnihub.core.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import dev.samstevens.totp.code.*;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.security.SecureRandom;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TwoFactorService {

    private static final Logger log = LoggerFactory.getLogger(TwoFactorService.class);
    private static final SecureRandom random = new SecureRandom();
    private static final String BACKUP_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private CacheManager cacheManager;
    @Autowired(required = false) private JavaMailSender mailSender;
    @Value("${spring.mail.username}")
    private String fromEmail;

    // ── TOTP ────────────────────────────────────────────────────────────────

    public Map<String, Object> setupTotp(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        SecretGenerator secretGenerator = new DefaultSecretGenerator();
        String secret = secretGenerator.generate();
        user.setTotpSecret(secret);
        userRepository.save(user);

        String otpauthUri = "otpauth://totp/OmniHub:" + user.getEmail()
                + "?secret=" + secret + "&issuer=OmniHub&algorithm=SHA1&digits=6&period=30";

        String qrDataUrl = generateQrDataUrl(otpauthUri);
        return Map.of("secret", secret, "qrCodeDataUrl", qrDataUrl, "otpauthUri", otpauthUri);
    }

    public List<String> confirmTotpSetup(Long userId, String code) {
        User user = userRepository.findById(userId).orElseThrow();
        if (user.getTotpSecret() == null) throw new RuntimeException("TOTP setup not initiated");
        if (!verifyTotpCodeRaw(user.getTotpSecret(), code)) {
            throw new RuntimeException("Invalid code. Please try again.");
        }
        user.setTotpEnabled(true);
        user.setTwoFactorMethod("TOTP");

        List<String> backupCodes = generateBackupCodes(8);
        String hashed = backupCodes.stream()
                .map(passwordEncoder::encode)
                .collect(Collectors.joining(";"));
        user.setTotpBackupCodes(hashed);
        userRepository.save(user);
        return backupCodes;
    }

    public boolean verifyTotpCode(Long userId, String code) {
        User user = userRepository.findById(userId).orElseThrow();
        if (user.getTotpSecret() == null) return false;
        if (verifyTotpCodeRaw(user.getTotpSecret(), code)) return true;
        return verifyAndConsumeBackupCode(user, code);
    }

    private boolean verifyTotpCodeRaw(String secret, String code) {
        try {
            CodeVerifier verifier = new DefaultCodeVerifier(new DefaultCodeGenerator(), new SystemTimeProvider());
            return verifier.isValidCode(secret, code);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean verifyAndConsumeBackupCode(User user, String code) {
        if (user.getTotpBackupCodes() == null) return false;
        String[] hashes = user.getTotpBackupCodes().split(";");
        for (int i = 0; i < hashes.length; i++) {
            if (!hashes[i].isBlank() && passwordEncoder.matches(code.toUpperCase(), hashes[i])) {
                hashes[i] = "";
                user.setTotpBackupCodes(String.join(";", hashes));
                userRepository.save(user);
                return true;
            }
        }
        return false;
    }

    // ── Email / SMS OTP ─────────────────────────────────────────────────────

    public void sendEmailOtp(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        String otp = String.format("%06d", random.nextInt(1_000_000));
        Cache cache = cacheManager.getCache("otpCache");
        if (cache != null) cache.put("2fa:" + userId, passwordEncoder.encode(otp));

        if (mailSender == null) {
            log.warn("Mail not configured. 2FA OTP for userId {}: {}", userId, otp);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromEmail);
            msg.setTo(user.getEmail());
            msg.setSubject("OmniHub — Login Verification Code");
            msg.setText("Your OmniHub login code is: " + otp + "\n\nExpires in 15 minutes. Do not share this code.");
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send 2FA email OTP", e);
            throw new RuntimeException("Failed to send verification code email");
        }
    }

    public boolean verifyEmailOtp(Long userId, String code) {
        Cache cache = cacheManager.getCache("otpCache");
        if (cache == null) return false;
        Cache.ValueWrapper wrapper = cache.get("2fa:" + userId);
        if (wrapper == null) return false;
        boolean valid = passwordEncoder.matches(code, (String) wrapper.get());
        if (valid) cache.evict("2fa:" + userId);
        return valid;
    }

    // ── Push approval (polling-based — works from any device via email link) ─

    public String initiatePushChallenge(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        String token = UUID.randomUUID().toString();
        user.setPendingPushChallengeToken(token);
        user.setPushChallengeStatus("PENDING");
        userRepository.save(user);

        // Send email with approve/deny links
        if (mailSender != null) {
            try {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setFrom(fromEmail);
                msg.setTo(user.getEmail());
                msg.setSubject("OmniHub — Approve Login");
                msg.setText("A login attempt was made to your OmniHub account.\n\n" +
                        "If this was you, approve here (link opens in browser):\n" +
                        "Token: " + token + "\n\n" +
                        "If you did NOT initiate this, ignore this email.");
                mailSender.send(msg);
            } catch (Exception e) {
                log.error("Failed to send push challenge email", e);
            }
        } else {
            log.warn("Mail not configured. Push challenge token for userId {}: {}", userId, token);
        }

        return token;
    }

    public String pollPushStatus(Long userId, String token) {
        User user = userRepository.findById(userId).orElseThrow();
        if (!token.equals(user.getPendingPushChallengeToken())) return "INVALID";
        return user.getPushChallengeStatus() != null ? user.getPushChallengeStatus() : "PENDING";
    }

    public void approvePushChallenge(Long userId, String token) {
        User user = userRepository.findById(userId).orElseThrow();
        if (!token.equals(user.getPendingPushChallengeToken())) throw new RuntimeException("Invalid token");
        user.setPushChallengeStatus("APPROVED");
        userRepository.save(user);
    }

    public void denyPushChallenge(Long userId, String token) {
        User user = userRepository.findById(userId).orElseThrow();
        if (!token.equals(user.getPendingPushChallengeToken())) throw new RuntimeException("Invalid token");
        user.setPushChallengeStatus("DENIED");
        userRepository.save(user);
    }

    // ── Disable 2FA ─────────────────────────────────────────────────────────

    public void disable2FA(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        user.setTotpSecret(null);
        user.setTotpEnabled(false);
        user.setTwoFactorMethod("NONE");
        user.setTotpBackupCodes(null);
        userRepository.save(user);
    }

    // ── QR Code helper ───────────────────────────────────────────────────────

    private String generateQrDataUrl(String content) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, 200, 200);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception e) {
            log.error("Failed to generate QR code", e);
            return "";
        }
    }

    private List<String> generateBackupCodes(int count) {
        List<String> codes = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            StringBuilder sb = new StringBuilder();
            for (int j = 0; j < 8; j++) {
                sb.append(BACKUP_CODE_CHARS.charAt(random.nextInt(BACKUP_CODE_CHARS.length())));
            }
            codes.add(sb.toString());
        }
        return codes;
    }
}
