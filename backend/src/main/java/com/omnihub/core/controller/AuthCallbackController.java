package com.omnihub.core.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@RestController
public class AuthCallbackController {

    @Value("${microsoft.client.id}")
    private String clientId;

    @Value("${microsoft.client.secret}")
    private String clientSecret;

    @Value("${microsoft.redirect.uri}")
    private String redirectUri;

    @RestController
    public static class TokenStore {
        public static String refreshToken = null;
    }

    @GetMapping("/auth/login")
    public ResponseEntity<Void> login() {
        String url = UriComponentsBuilder
                .fromHttpUrl("https://login.microsoftonline.com/common/oauth2/v2.0/authorize")
                .queryParam("client_id", clientId)
                .queryParam("response_type", "code")
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_mode", "query")
                .queryParam("scope", "offline_access Files.ReadWrite Mail.Send")
                .build()
                .toUriString();

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(url))
                .build();
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
            body.add("redirect_uri", redirectUri);
            body.add("grant_type", "authorization_code");
            body.add("scope", "offline_access Files.ReadWrite Mail.Send");

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
                "<h2>Success!</h2><p><b>Refresh Token:</b><br/><textarea style='width:100%;height:100px;'>" + refreshToken + "</textarea></p>"
                + "<p>Update your <b>MICROSOFT_REFRESH_TOKEN</b> environment variable with this value.</p>"
            );

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
