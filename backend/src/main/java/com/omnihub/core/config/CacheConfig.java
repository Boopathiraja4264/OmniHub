package com.omnihub.core.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager mgr = new SimpleCacheManager();
        mgr.setCaches(List.of(
            build("otpCache",        15, TimeUnit.MINUTES, 10_000),
            build("rateLimitCache",   1, TimeUnit.MINUTES, 50_000),
            build("tokenBlacklist",  25, TimeUnit.HOURS,   10_000),
            build("oauthCodeCache",   5, TimeUnit.MINUTES,  1_000)
        ));
        return mgr;
    }

    private CaffeineCache build(String name, long duration, TimeUnit unit, long maxSize) {
        Cache<Object, Object> cache = Caffeine.newBuilder()
                .expireAfterWrite(duration, unit)
                .maximumSize(maxSize)
                .build();
        return new CaffeineCache(name, cache);
    }
}
