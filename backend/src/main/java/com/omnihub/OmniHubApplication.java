package com.omnihub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class OmniHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(OmniHubApplication.class, args);
    }
}
