package com.omnihub.core.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
public class AuthCallbackController {

    @Value("${microsoft.client.id}")
    private String clientId;

    @Value("${microsoft.client.secret}")
    private String clientSecret;

    @RestController
    public static class TokenStore {
        public static String refreshToken = null;
    }

    @GetMapping("/auth/callback")
    public ResponseEntity<String> callback(@RequestParam String code) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("client_id", clientId);
            body.add("client_secret", clientSecret);
            body.add("code", code);
            body.add("redirect_uri", "http://localhost:8080/auth/callback");
            body.add("grant_type", "authorization_code");
            body.add("scope", "offline_access Files.ReadWrite");

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

            ResponseEntity<java.util.Map> response = restTemplate.postForEntity(
                "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                request,
                java.util.Map.class
            );

            String refreshToken = (String) response.getBody().get("refresh_token");
            String accessToken = (String) response.getBody().get("access_token");

            TokenStore.refreshToken = refreshToken;

            System.out.println("===========================================");
            System.out.println("REFRESH TOKEN: " + refreshToken);
            System.out.println("===========================================");

            return ResponseEntity.ok(
                "<h2>Success!</h2><p><b>Refresh Token:</b><br/>" + refreshToken + "</p>"
            );

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
