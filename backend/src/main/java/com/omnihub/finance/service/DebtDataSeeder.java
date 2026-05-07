package com.omnihub.finance.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class DebtDataSeeder implements ApplicationRunner {

    @Autowired private DebtService debtService;

    @Override
    public void run(ApplicationArguments args) {
        debtService.seedExistingData();
    }
}
