package com.omnihub.core.service;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
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

import java.security.SecureRandom;

@Service
public class EmailVerificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);
    private static final SecureRandom random = new SecureRandom();

    @Autowired private UserRepository userRepository;
    @Autowired(required = false) private JavaMailSender mailSender;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private CacheManager cacheManager;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendVerificationOtp(String email) {
        String otp = String.format("%06d", random.nextInt(1_000_000));
        String hashedOtp = passwordEncoder.encode(otp);
        Cache cache = cacheManager.getCache("otpCache");
        if (cache != null) cache.put("verify:" + email.toLowerCase(), hashedOtp);

        if (mailSender == null) {
            log.warn("Mail not configured (MAIL_USERNAME not set). Verification OTP for {} is: {}", email, otp);
            return; // In dev without mail, OTP is logged above — skip sending
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromEmail);
            msg.setTo(email);
            msg.setSubject("OmniHub — Email Verification");
            msg.setText("Your OmniHub verification code is: " + otp + "\n\nThis code expires in 15 minutes.");
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send verification email", e);
            throw new RuntimeException("Failed to send verification email. Please try again.");
        }
    }

    public void verifyOtp(String email, String otp) {
        Cache cache = cacheManager.getCache("otpCache");
        if (cache == null) throw new RuntimeException("Verification service unavailable");

        Cache.ValueWrapper wrapper = cache.get("verify:" + email.toLowerCase());
        if (wrapper == null) throw new RuntimeException("Verification code expired or not found");

        String hashedOtp = (String) wrapper.get();
        if (!passwordEncoder.matches(otp, hashedOtp)) {
            throw new RuntimeException("Invalid verification code");
        }

        cache.evict("verify:" + email.toLowerCase());

        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setEmailVerified(true);
        userRepository.save(user);
    }
}
