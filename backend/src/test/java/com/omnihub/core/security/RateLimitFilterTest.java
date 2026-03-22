package com.omnihub.core.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;

class RateLimitFilterTest {

    private RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter();
    }

    @Test
    void underLimit_requestPassesThrough() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        assertEquals(200, response.getStatus());
        assertNotNull(chain.getRequest(), "Filter chain should have been called");
    }

    @Test
    void exceeds10Attempts_returns429() throws Exception {
        String ip = "1.2.3.4";

        // First 10 — should all pass
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
            req.setRemoteAddr(ip);
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilterInternal(req, res, new MockFilterChain());
            assertEquals(200, res.getStatus(), "Attempt " + (i + 1) + " should pass");
        }

        // 11th attempt should be blocked
        MockHttpServletRequest req11 = new MockHttpServletRequest("POST", "/api/auth/login");
        req11.setRemoteAddr(ip);
        MockHttpServletResponse res11 = new MockHttpServletResponse();
        MockFilterChain chain11 = new MockFilterChain();

        filter.doFilterInternal(req11, res11, chain11);

        assertEquals(429, res11.getStatus());
        assertNull(chain11.getRequest(), "Filter chain should NOT have been called on blocked request");
    }

    @Test
    void forgotPasswordPath_alsoRateLimited() throws Exception {
        String ip = "5.6.7.8";
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/forgot-password");
            req.setRemoteAddr(ip);
            filter.doFilterInternal(req, new MockHttpServletResponse(), new MockFilterChain());
        }

        MockHttpServletRequest req11 = new MockHttpServletRequest("POST", "/api/auth/forgot-password");
        req11.setRemoteAddr(ip);
        MockHttpServletResponse res11 = new MockHttpServletResponse();
        filter.doFilterInternal(req11, res11, new MockFilterChain());

        assertEquals(429, res11.getStatus());
    }

    @Test
    void differentIps_haveIndependentCounters() throws Exception {
        // Fill up ip A
        for (int i = 0; i < 11; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
            req.setRemoteAddr("9.9.9.9");
            filter.doFilterInternal(req, new MockHttpServletResponse(), new MockFilterChain());
        }

        // ip B should still be allowed
        MockHttpServletRequest reqB = new MockHttpServletRequest("POST", "/api/auth/login");
        reqB.setRemoteAddr("8.8.8.8");
        MockHttpServletResponse resB = new MockHttpServletResponse();
        MockFilterChain chainB = new MockFilterChain();
        filter.doFilterInternal(reqB, resB, chainB);

        assertEquals(200, resB.getStatus());
        assertNotNull(chainB.getRequest());
    }

    @Test
    void nonRateLimitedPath_neverBlocked() throws Exception {
        String ip = "3.3.3.3";
        // Even 20 requests to /api/auth/me should never hit rate limiting
        for (int i = 0; i < 20; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/auth/me");
            req.setRemoteAddr(ip);
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            filter.doFilterInternal(req, res, chain);
            assertEquals(200, res.getStatus());
        }
    }

    @Test
    void xForwardedFor_usedAsClientIp() throws Exception {
        String realIp = "203.0.113.5";
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
            req.addHeader("X-Forwarded-For", realIp + ", 10.0.0.1");
            filter.doFilterInternal(req, new MockHttpServletResponse(), new MockFilterChain());
        }

        MockHttpServletRequest req11 = new MockHttpServletRequest("POST", "/api/auth/login");
        req11.addHeader("X-Forwarded-For", realIp + ", 10.0.0.1");
        MockHttpServletResponse res11 = new MockHttpServletResponse();
        filter.doFilterInternal(req11, res11, new MockFilterChain());

        assertEquals(429, res11.getStatus());
    }

    @Test
    void getRequest_toLoginPath_notRateLimited() throws Exception {
        String ip = "4.4.4.4";
        // GET /api/auth/login is not a POST — should never be rate-limited
        for (int i = 0; i < 20; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/auth/login");
            req.setRemoteAddr(ip);
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            filter.doFilterInternal(req, res, chain);
            assertEquals(200, res.getStatus());
        }
    }
}
