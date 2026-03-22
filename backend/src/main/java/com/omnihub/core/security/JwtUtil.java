package com.omnihub.core.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    @Autowired
    private CacheManager cacheManager;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public String extractPurpose(String token) {
        return extractAllClaims(token).get("purpose", String.class);
    }

    public String extractJti(String token) {
        return extractAllClaims(token).get("jti", String.class);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        return claimsResolver.apply(extractAllClaims(token));
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(token).getBody();
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("jti", UUID.randomUUID().toString());
        return createToken(claims, userDetails.getUsername(), expiration);
    }

    /** Short-lived token used during 2FA challenge (5 minutes). */
    public String generateTempToken(String email) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("purpose", "2fa_challenge");
        claims.put("jti", UUID.randomUUID().toString());
        return createToken(claims, email, 5 * 60 * 1000L);
    }

    private String createToken(Map<String, Object> claims, String subject, long ttlMs) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + ttlMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        if ("2fa_challenge".equals(extractPurpose(token))) return false;
        if (isRevoked(token)) return false;
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    /** Add a token's JTI to the blacklist (used on logout). */
    public void revokeToken(String token) {
        try {
            String jti = extractJti(token);
            if (jti != null) {
                Cache blacklist = cacheManager.getCache("tokenBlacklist");
                if (blacklist != null) blacklist.put(jti, true);
            }
        } catch (Exception ignored) {}
    }

    /** Check if a token has been revoked. */
    public boolean isRevoked(String token) {
        try {
            String jti = extractJti(token);
            if (jti == null) return false;
            Cache blacklist = cacheManager.getCache("tokenBlacklist");
            return blacklist != null && blacklist.get(jti) != null;
        } catch (Exception e) {
            return false;
        }
    }
}
