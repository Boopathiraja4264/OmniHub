package com.omnihub.core.service;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    @Autowired private UserRepository userRepository;
    @Autowired(required = false) private JavaMailSender mailSender;
    @Autowired private PasswordEncoder passwordEncoder;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.base-url}")
    private String baseUrl;

    public void sendResetLink(String email) {
        User user = userRepository.findByEmail(email.toLowerCase()).orElse(null);
        if (user == null) return; // Prevent email enumeration

        String rawToken = UUID.randomUUID().toString();
        String tokenHash = sha256(rawToken);

        user.setPasswordResetToken(tokenHash); // Store hash, not raw token
        user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        String link = baseUrl + "/reset-password?token=" + rawToken; // Email gets raw token

        if (mailSender == null) {
            log.warn("Mail not configured. Reset link for {}: {}", email, link);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromEmail);
            msg.setTo(email);
            msg.setSubject("OmniHub — Password Reset");
            msg.setText("Click the link below to reset your password:\n\n" + link +
                    "\n\nThis link expires in 1 hour. If you did not request this, ignore this email.");
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send password reset email", e);
        }
    }

    public void resetPassword(String rawToken, String newPassword) {
        String tokenHash = sha256(rawToken);
        User user = userRepository.findByPasswordResetToken(tokenHash)
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset link"));

        if (user.getPasswordResetTokenExpiry() == null ||
                user.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Reset link has expired. Please request a new one.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 unavailable", e);
        }
    }
}
