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

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);
        return new AuthResponse(token, user.getEmail(), user.getFullName());
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword()));

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        String token = jwtUtil.generateToken(userDetails);
        User user = userRepository.findByEmail(email).orElseThrow();
        return new AuthResponse(token, user.getEmail(), user.getFullName());
    }
}
