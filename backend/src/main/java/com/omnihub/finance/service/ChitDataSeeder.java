package com.omnihub.finance.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Runs after full application context is ready.
 * Seeds the user's existing chit fund data on first deployment.
 * Safe to re-run — checks existsByUserId before inserting anything.
 */
@Component
public class ChitDataSeeder implements ApplicationRunner {

    @Autowired
    private ChitService chitService;

    @Override
    public void run(ApplicationArguments args) {
        chitService.seedExistingData();
    }
}
