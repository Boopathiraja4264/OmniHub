package com.omnihub.backup.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@Service
public class OneDriveTokenService {

    @Value("${microsoft.client.id}")
    private String clientId;

    @Value("${microsoft.client.secret}")
    private String clientSecret;

    @Value("${microsoft.refresh.token}")
    private String storedRefreshToken;

    private String currentAccessToken;
    private String currentRefreshToken;

    public String getAccessToken() {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            String tokenToUse = currentRefreshToken != null ? currentRefreshToken : storedRefreshToken;

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("client_id", clientId);
            body.add("client_secret", clientSecret);
            body.add("refresh_token", tokenToUse);
            body.add("grant_type", "refresh_token");
            body.add("scope", "offline_access Files.ReadWrite Mail.Send");

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            try {
                ResponseEntity<Map> response = restTemplate.postForEntity(
                        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                        request, Map.class);

                currentAccessToken = (String) response.getBody().get("access_token");
                String newRefreshToken = (String) response.getBody().get("refresh_token");
                if (newRefreshToken != null)
                    currentRefreshToken = newRefreshToken;

                System.out.println("OneDrive token refreshed successfully");
                return currentAccessToken;
            } catch (org.springframework.web.client.HttpClientErrorException e) {
                System.err.println("Microsoft Auth Error: " + e.getResponseBodyAsString());
                throw new RuntimeException("Microsoft Auth Error: " + e.getResponseBodyAsString());
            }

        } catch (Exception e) {
            System.err.println("OneDrive token refresh failed: " + e.getMessage());
            throw new RuntimeException("OneDrive token refresh failed: " + e.getMessage());
        }
    }
}
