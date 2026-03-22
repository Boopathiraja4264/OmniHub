package com.omnihub.core.security;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2SuccessHandler.class);

    @Autowired private UserRepository userRepository;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private UserDetailsService userDetailsService;
    @Autowired private CacheManager cacheManager;

    @Value("${app.base-url}")
    private String baseUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attrs = oAuth2User.getAttributes();

        String email = extractEmail(attrs);
        String name = extractName(attrs);
        String provider = extractProvider(authentication);
        String providerId = extractProviderId(attrs);

        if (email == null) {
            response.sendRedirect(baseUrl + "/login?error=oauth_no_email");
            return;
        }

        email = email.toLowerCase().trim();
        final String finalEmail = email;
        final String finalName = name;
        final String finalProvider = provider;
        final String finalProviderId = providerId;

        User user = userRepository.findByEmail(finalEmail).orElseGet(() -> {
            User newUser = User.builder()
                    .email(finalEmail)
                    .fullName(finalName != null ? finalName : finalEmail)
                    .password(UUID.randomUUID().toString())
                    .oauthProvider(finalProvider)
                    .oauthProviderId(finalProviderId)
                    .emailVerified(true)
                    .build();
            return userRepository.save(newUser);
        });

        if (user.getOauthProvider() == null) {
            user.setOauthProvider(finalProvider);
            user.setOauthProviderId(finalProviderId);
            user.setEmailVerified(true);
            userRepository.save(user);
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        // Store token in cache under a one-time code (never expose token in URL)
        String code = UUID.randomUUID().toString();
        Cache cache = cacheManager.getCache("oauthCodeCache");
        if (cache != null) {
            Map<String, String> payload = new java.util.HashMap<>();
            payload.put("token", token);
            payload.put("email", user.getEmail());
            payload.put("fullName", user.getFullName() != null ? user.getFullName() : user.getEmail());
            cache.put(code, payload);
        }

        // Redirect with short-lived code — frontend exchanges it for a session cookie
        response.sendRedirect(baseUrl + "/oauth-callback?code=" + code);
    }

    private String extractEmail(Map<String, Object> attrs) {
        if (attrs.containsKey("email")) return (String) attrs.get("email");
        if (attrs.containsKey("preferred_username")) return (String) attrs.get("preferred_username");
        return null;
    }

    private String extractName(Map<String, Object> attrs) {
        if (attrs.containsKey("name")) return (String) attrs.get("name");
        if (attrs.containsKey("login")) return (String) attrs.get("login");
        return null;
    }

    private String extractProvider(Authentication auth) {
        String name = auth.getClass().getSimpleName().toLowerCase();
        if (name.contains("google")) return "google";
        if (name.contains("github")) return "github";
        if (name.contains("microsoft")) return "microsoft";
        if (name.contains("linkedin")) return "linkedin";
        try {
            String str = auth.getDetails() != null ? auth.getDetails().toString() : "";
            if (str.contains("google")) return "google";
            if (str.contains("github")) return "github";
        } catch (Exception ignored) {}
        return "oauth2";
    }

    private String extractProviderId(Map<String, Object> attrs) {
        if (attrs.containsKey("sub")) return String.valueOf(attrs.get("sub"));
        if (attrs.containsKey("id")) return String.valueOf(attrs.get("id"));
        return UUID.randomUUID().toString();
    }
}
