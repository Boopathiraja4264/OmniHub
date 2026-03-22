package com.omnihub.core.service;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.core.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private UserDetailsServiceImpl userDetailsService;
    @Mock private JwtUtil jwtUtil;
    @Mock private EmailVerificationService emailVerificationService;
    @Mock private TwoFactorService twoFactorService;

    @InjectMocks private AuthService authService;

    private User buildVerifiedUser(String email) {
        User u = new User();
        org.springframework.test.util.ReflectionTestUtils.setField(u, "id", 1L);
        org.springframework.test.util.ReflectionTestUtils.setField(u, "email", email);
        org.springframework.test.util.ReflectionTestUtils.setField(u, "fullName", "Test User");
        org.springframework.test.util.ReflectionTestUtils.setField(u, "emailVerified", true);
        org.springframework.test.util.ReflectionTestUtils.setField(u, "twoFactorMethod", "NONE");
        org.springframework.test.util.ReflectionTestUtils.setField(u, "password", "hashed");
        return u;
    }

    // ── register ──────────────────────────────────────────────────────────────

    @Test
    void register_newUser_sendsVerificationAndReturnsNullToken() {
        when(userRepository.existsByEmail("new@test.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        RegisterRequest req = new RegisterRequest();
        req.setFullName("Test");
        req.setEmail("new@test.com");
        req.setPassword("Password1");

        AuthResponse res = authService.register(req);

        assertNull(res.getToken(), "No JWT should be issued before email verification");
        assertTrue(res.isRequiresEmailVerification());
        verify(emailVerificationService).sendVerificationOtp("new@test.com");
    }

    @Test
    void register_duplicateEmail_throwsException() {
        when(userRepository.existsByEmail("taken@test.com")).thenReturn(true);

        RegisterRequest req = new RegisterRequest();
        req.setEmail("taken@test.com");
        req.setPassword("Password1");

        assertThrows(RuntimeException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_emailIsNormalized_toLowerCase() {
        when(userRepository.existsByEmail("upper@test.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        RegisterRequest req = new RegisterRequest();
        req.setFullName("Test");
        req.setEmail("UPPER@TEST.COM");
        req.setPassword("Password1");

        authService.register(req);
        verify(userRepository).existsByEmail("upper@test.com");
    }

    // ── login ─────────────────────────────────────────────────────────────────

    @Test
    void login_validCredentials_returnsJwt() {
        User user = buildVerifiedUser("user@test.com");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

        UserDetails ud = org.springframework.security.core.userdetails.User
                .withUsername("user@test.com").password("x").authorities(Collections.emptyList()).build();
        when(userDetailsService.loadUserByUsername("user@test.com")).thenReturn(ud);
        when(jwtUtil.generateToken(ud)).thenReturn("jwt-token");

        LoginRequest req = new LoginRequest();
        req.setEmail("user@test.com");
        req.setPassword("Password1");

        AuthResponse res = authService.login(req);

        assertEquals("jwt-token", res.getToken());
        assertFalse(res.isRequiresEmailVerification());
        assertFalse(res.isTwoFactorRequired());
    }

    @Test
    void login_badCredentials_throwsException() {
        doThrow(new BadCredentialsException("bad")).when(authenticationManager)
                .authenticate(any(UsernamePasswordAuthenticationToken.class));

        LoginRequest req = new LoginRequest();
        req.setEmail("user@test.com");
        req.setPassword("wrong");

        assertThrows(RuntimeException.class, () -> authService.login(req));
    }

    @Test
    void login_emailNotVerified_sendsOtpAndReturnsNullToken() {
        User user = buildVerifiedUser("user@test.com");
        org.springframework.test.util.ReflectionTestUtils.setField(user, "emailVerified", false);
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

        LoginRequest req = new LoginRequest();
        req.setEmail("user@test.com");
        req.setPassword("Password1");

        AuthResponse res = authService.login(req);

        assertNull(res.getToken());
        assertTrue(res.isRequiresEmailVerification());
        verify(emailVerificationService).sendVerificationOtp("user@test.com");
    }

    @Test
    void login_with2FA_returnsTemp_token() {
        User user = buildVerifiedUser("user@test.com");
        org.springframework.test.util.ReflectionTestUtils.setField(user, "twoFactorMethod", "TOTP");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(jwtUtil.generateTempToken("user@test.com")).thenReturn("temp-token");

        LoginRequest req = new LoginRequest();
        req.setEmail("user@test.com");
        req.setPassword("Password1");

        AuthResponse res = authService.login(req);

        assertNull(res.getToken());
        assertTrue(res.isTwoFactorRequired());
        assertEquals("temp-token", res.getTempToken());
    }

    // ── verify2FA ─────────────────────────────────────────────────────────────

    @Test
    void verify2FA_totp_validCode_returnsJwt() {
        User user = buildVerifiedUser("user@test.com");
        when(jwtUtil.extractUsername("temp-token")).thenReturn("user@test.com");
        when(jwtUtil.extractPurpose("temp-token")).thenReturn("2fa_challenge");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(twoFactorService.verifyTotpCode(1L, "123456")).thenReturn(true);

        UserDetails ud = org.springframework.security.core.userdetails.User
                .withUsername("user@test.com").password("x").authorities(Collections.emptyList()).build();
        when(userDetailsService.loadUserByUsername("user@test.com")).thenReturn(ud);
        when(jwtUtil.generateToken(ud)).thenReturn("full-jwt");

        AuthResponse res = authService.verify2FA("temp-token", "123456", "TOTP", null);

        assertEquals("full-jwt", res.getToken());
    }

    @Test
    void verify2FA_invalidCode_throwsException() {
        User user = buildVerifiedUser("user@test.com");
        when(jwtUtil.extractUsername("temp-token")).thenReturn("user@test.com");
        when(jwtUtil.extractPurpose("temp-token")).thenReturn("2fa_challenge");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(twoFactorService.verifyTotpCode(1L, "000000")).thenReturn(false);

        assertThrows(RuntimeException.class,
                () -> authService.verify2FA("temp-token", "000000", "TOTP", null));
    }

    // ── changePassword ────────────────────────────────────────────────────────

    @Test
    void changePassword_correctCurrent_updatesPassword() {
        User user = buildVerifiedUser("user@test.com");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPass", "hashed")).thenReturn(true);
        when(passwordEncoder.encode("NewPass1")).thenReturn("new-hashed");

        authService.changePassword("user@test.com", "oldPass", "NewPass1");

        verify(userRepository).save(user);
    }

    @Test
    void changePassword_wrongCurrent_throwsException() {
        User user = buildVerifiedUser("user@test.com");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThrows(RuntimeException.class,
                () -> authService.changePassword("user@test.com", "wrong", "NewPass1"));
        verify(userRepository, never()).save(any());
    }
}
