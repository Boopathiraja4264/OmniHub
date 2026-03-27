package com.omnihub.core.service;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.core.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private UserDetailsServiceImpl userDetailsService;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private EmailVerificationService emailVerificationService;
    @Autowired private TwoFactorService twoFactorService;

    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already in use");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);

        // Send email verification OTP — do not issue JWT yet
        emailVerificationService.sendVerificationOtp(email);

        return new AuthResponse(null, email, user.getFullName(), true, false, null, null, null);
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword()));
        } catch (BadCredentialsException e) {
            throw new RuntimeException("Invalid email or password");
        }

        User user = userRepository.findByEmail(email).orElseThrow();

        if (!user.isEmailVerified()) {
            emailVerificationService.sendVerificationOtp(email);
            return new AuthResponse(null, email, user.getFullName(), true, false, null, null, null);
        }

        // 2FA gate
        String method = user.getTwoFactorMethod();
        if (!"NONE".equals(method)) {
            String tempToken = jwtUtil.generateTempToken(email);

            if ("EMAIL_OTP".equals(method)) {
                twoFactorService.sendEmailOtp(user.getId());
            } else if ("PUSH".equals(method)) {
                String challengeToken = twoFactorService.initiatePushChallenge(user.getId());
                return new AuthResponse(null, email, user.getFullName(), false, true, method, tempToken, challengeToken);
            }

            return new AuthResponse(null, email, user.getFullName(), false, true, method, tempToken, null);
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        String token = jwtUtil.generateToken(userDetails);
        return new AuthResponse(token, email, user.getFullName(), false, false, null, null, null);
    }

    public AuthResponse verify2FA(String tempToken, String code, String method, String challengeToken) {
        String email;
        try {
            email = jwtUtil.extractUsername(tempToken);
            if (!"2fa_challenge".equals(jwtUtil.extractPurpose(tempToken))) {
                throw new RuntimeException("Invalid token");
            }
        } catch (Exception e) {
            throw new RuntimeException("Invalid or expired session. Please log in again.");
        }

        User user = userRepository.findByEmail(email).orElseThrow();
        boolean verified = false;

        switch (method) {
            case "TOTP":
                verified = twoFactorService.verifyTotpCode(user.getId(), code);
                break;
            case "EMAIL_OTP":
            case "SMS_OTP":
                verified = twoFactorService.verifyEmailOtp(user.getId(), code);
                break;
            case "PUSH":
                if (code != null && !code.isBlank()) {
                    // Fallback: user typed TOTP code from authenticator app
                    verified = twoFactorService.verifyTotpCode(user.getId(), code);
                } else {
                    String status = twoFactorService.pollPushStatus(user.getId(), challengeToken);
                    verified = "APPROVED".equals(status);
                }
                break;
            default:
                throw new RuntimeException("Unknown 2FA method");
        }

        if (!verified) throw new RuntimeException("Invalid or expired code");

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        String token = jwtUtil.generateToken(userDetails);
        return new AuthResponse(token, email, user.getFullName(), false, false, null, null, null);
    }

    /** Called after email OTP verification — issues the full JWT without re-authenticating. */
    public AuthResponse loginAfterVerification(String email) {
        User user = userRepository.findByEmail(email.toLowerCase()).orElseThrow();
        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        String token = jwtUtil.generateToken(userDetails);
        return new AuthResponse(token, user.getEmail(), user.getFullName(), false, false, null, null, null);
    }

    public void changePassword(String email, String currentPassword, String newPassword) {
        User user = userRepository.findByEmail(email).orElseThrow();
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    /** For SSO users who have never set a password — no current password required. */
    public void setPassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email).orElseThrow();
        if (user.getOauthProvider() == null || user.getOauthProvider().isBlank()) {
            throw new RuntimeException("Use change-password instead");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
