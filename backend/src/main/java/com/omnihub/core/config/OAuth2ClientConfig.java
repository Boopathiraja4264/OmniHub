package com.omnihub.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds ClientRegistrationRepository programmatically so OAuth2 providers
 * with no credentials configured (empty env vars) are simply skipped —
 * avoiding Spring Boot's validation that requires non-empty client IDs.
 */
@Configuration
public class OAuth2ClientConfig {

    @Value("${GOOGLE_CLIENT_ID:}")            private String googleId;
    @Value("${GOOGLE_CLIENT_SECRET:}")        private String googleSecret;
    @Value("${GITHUB_CLIENT_ID:}")            private String githubId;
    @Value("${GITHUB_CLIENT_SECRET:}")        private String githubSecret;
    @Value("${MICROSOFT_SSO_CLIENT_ID:}")     private String microsoftId;
    @Value("${MICROSOFT_SSO_CLIENT_SECRET:}") private String microsoftSecret;
    @Value("${LINKEDIN_CLIENT_ID:}")          private String linkedinId;
    @Value("${LINKEDIN_CLIENT_SECRET:}")      private String linkedinSecret;

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        List<ClientRegistration> registrations = new ArrayList<>();

        if (!googleId.isBlank()) {
            registrations.add(ClientRegistration.withRegistrationId("google")
                    .clientId(googleId).clientSecret(googleSecret)
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri("{baseUrl}/login/oauth2/code/google")
                    .scope("openid", "profile", "email")
                    .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                    .tokenUri("https://www.googleapis.com/oauth2/v4/token")
                    .userInfoUri("https://www.googleapis.com/oauth2/v3/userinfo")
                    .userNameAttributeName("email")
                    .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                    .clientName("Google")
                    .build());
        }

        if (!githubId.isBlank()) {
            registrations.add(ClientRegistration.withRegistrationId("github")
                    .clientId(githubId).clientSecret(githubSecret)
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri("{baseUrl}/login/oauth2/code/github")
                    .scope("user:email")
                    .authorizationUri("https://github.com/login/oauth/authorize")
                    .tokenUri("https://github.com/login/oauth/access_token")
                    .userInfoUri("https://api.github.com/user")
                    .userNameAttributeName("login")
                    .clientName("GitHub")
                    .build());
        }

        if (!microsoftId.isBlank()) {
            registrations.add(ClientRegistration.withRegistrationId("microsoft-sso")
                    .clientId(microsoftId).clientSecret(microsoftSecret)
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri("{baseUrl}/login/oauth2/code/microsoft-sso")
                    .scope("openid", "profile", "email")
                    .authorizationUri("https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize")
                    .tokenUri("https://login.microsoftonline.com/consumers/oauth2/v2.0/token")
                    .userInfoUri("https://graph.microsoft.com/oidc/userinfo")
                    .userNameAttributeName("email")
                    .jwkSetUri("https://login.microsoftonline.com/consumers/discovery/v2.0/keys")
                    .clientName("Microsoft")
                    .build());
        }

        if (!linkedinId.isBlank()) {
            registrations.add(ClientRegistration.withRegistrationId("linkedin")
                    .clientId(linkedinId).clientSecret(linkedinSecret)
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri("{baseUrl}/login/oauth2/code/linkedin")
                    .scope("openid", "profile", "email")
                    .authorizationUri("https://www.linkedin.com/oauth/v2/authorization")
                    .tokenUri("https://www.linkedin.com/oauth/v2/accessToken")
                    .userInfoUri("https://api.linkedin.com/v2/userinfo")
                    .userNameAttributeName("email")
                    .clientName("LinkedIn")
                    .build());
        }

        if (registrations.isEmpty()) {
            // No SSO providers configured — no-op repository so app starts without OAuth2
            return registrationId -> null;
        }

        return new InMemoryClientRegistrationRepository(registrations);
    }
}
