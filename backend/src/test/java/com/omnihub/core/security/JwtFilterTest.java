package com.omnihub.core.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtFilterTest {

    @Mock private JwtUtil jwtUtil;
    @Mock private UserDetailsService userDetailsService;

    @InjectMocks private JwtFilter jwtFilter;

    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        userDetails = org.springframework.security.core.userdetails.User
                .withUsername("user@test.com").password("x").authorities(Collections.emptyList()).build();
    }

    @Test
    void cookieJwt_validToken_setsAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new jakarta.servlet.http.Cookie("jwt", "valid-token"));

        when(jwtUtil.extractUsername("valid-token")).thenReturn("user@test.com");
        when(userDetailsService.loadUserByUsername("user@test.com")).thenReturn(userDetails);
        when(jwtUtil.validateToken("valid-token", userDetails)).thenReturn(true);

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        jwtFilter.doFilterInternal(request, response, chain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals("user@test.com",
                SecurityContextHolder.getContext().getAuthentication().getName());
    }

    @Test
    void bearerHeader_validToken_setsAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer bearer-token");

        when(jwtUtil.extractUsername("bearer-token")).thenReturn("user@test.com");
        when(userDetailsService.loadUserByUsername("user@test.com")).thenReturn(userDetails);
        when(jwtUtil.validateToken("bearer-token", userDetails)).thenReturn(true);

        jwtFilter.doFilterInternal(request, new MockHttpServletResponse(), new MockFilterChain());

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void cookieTakesPriorityOverHeader() throws Exception {
        // When both cookie and header are present, cookie wins
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new jakarta.servlet.http.Cookie("jwt", "cookie-token"));
        request.addHeader("Authorization", "Bearer header-token");

        when(jwtUtil.extractUsername("cookie-token")).thenReturn("user@test.com");
        when(userDetailsService.loadUserByUsername("user@test.com")).thenReturn(userDetails);
        when(jwtUtil.validateToken("cookie-token", userDetails)).thenReturn(true);

        jwtFilter.doFilterInternal(request, new MockHttpServletResponse(), new MockFilterChain());

        // header-token should never be touched
        verify(jwtUtil, never()).extractUsername("header-token");
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void noToken_noAuthentication_chainContinues() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockFilterChain chain = new MockFilterChain();

        jwtFilter.doFilterInternal(request, new MockHttpServletResponse(), chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertNotNull(chain.getRequest(), "Filter chain must continue even with no token");
    }

    @Test
    void invalidToken_noAuthentication_chainContinues() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer bad-token");

        when(jwtUtil.extractUsername("bad-token")).thenThrow(new RuntimeException("Invalid JWT"));

        MockFilterChain chain = new MockFilterChain();
        jwtFilter.doFilterInternal(request, new MockHttpServletResponse(), chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertNotNull(chain.getRequest());
    }

    @Test
    void invalidTokenValidation_noAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer revoked-token");

        when(jwtUtil.extractUsername("revoked-token")).thenReturn("user@test.com");
        when(userDetailsService.loadUserByUsername("user@test.com")).thenReturn(userDetails);
        when(jwtUtil.validateToken("revoked-token", userDetails)).thenReturn(false);

        jwtFilter.doFilterInternal(request, new MockHttpServletResponse(), new MockFilterChain());

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
}
