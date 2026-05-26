package com.omnihub.core.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.omnihub.finance.entity.Transaction.TransactionType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class DTOs {

    public static class RegisterRequest {
        @NotBlank
        private String fullName;
        @Email
        @NotBlank
        private String email;
        @NotBlank
        @Size(min = 8, message = "Password must be at least 8 characters")
        @Pattern(regexp = "^(?=.*[A-Z])(?=.*\\d).{8,}$",
                 message = "Password must contain at least one uppercase letter and one digit")
        private String password;

        public String getFullName() {
            return fullName;
        }

        public void setFullName(String v) {
            fullName = v;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String v) {
            email = v;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String v) {
            password = v;
        }
    }

    public static class LoginRequest {
        @Email
        @NotBlank
        private String email;
        @NotBlank
        private String password;

        public String getEmail() {
            return email;
        }

        public void setEmail(String v) {
            email = v;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String v) {
            password = v;
        }
    }

    public static class AuthResponse {
        private String token, email, fullName, twoFactorMethod, tempToken, challengeToken;
        private boolean requiresEmailVerification;
        private boolean twoFactorRequired;

        public AuthResponse(String token, String email, String fullName) {
            this.token = token; this.email = email; this.fullName = fullName;
        }

        public AuthResponse(String token, String email, String fullName,
                            boolean requiresEmailVerification, boolean twoFactorRequired,
                            String twoFactorMethod, String tempToken, String challengeToken) {
            this.token = token; this.email = email; this.fullName = fullName;
            this.requiresEmailVerification = requiresEmailVerification;
            this.twoFactorRequired = twoFactorRequired;
            this.twoFactorMethod = twoFactorMethod;
            this.tempToken = tempToken;
            this.challengeToken = challengeToken;
        }

        public String getToken() { return token; }
        public String getEmail() { return email; }
        public String getFullName() { return fullName; }
        public boolean isRequiresEmailVerification() { return requiresEmailVerification; }
        public boolean isTwoFactorRequired() { return twoFactorRequired; }
        public String getTwoFactorMethod() { return twoFactorMethod; }
        public String getTempToken() { return tempToken; }
        public String getChallengeToken() { return challengeToken; }
    }

    public static class VerifyEmailRequest {
        @Email @NotBlank private String email;
        @NotBlank private String otp;
        public String getEmail() { return email; }
        public void setEmail(String v) { email = v; }
        public String getOtp() { return otp; }
        public void setOtp(String v) { otp = v; }
    }

    public static class ForgotPasswordRequest {
        @Email @NotBlank private String email;
        public String getEmail() { return email; }
        public void setEmail(String v) { email = v; }
    }

    public static class ResetPasswordRequest {
        @NotBlank private String token;
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters")
        @Pattern(regexp = "^(?=.*[A-Z])(?=.*\\d).{8,}$",
                 message = "Password must contain at least one uppercase letter and one digit")
        private String newPassword;
        public String getToken() { return token; }
        public void setToken(String v) { token = v; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String v) { newPassword = v; }
    }

    public static class ChangePasswordRequest {
        @NotBlank private String currentPassword;
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters")
        @Pattern(regexp = "^(?=.*[A-Z])(?=.*\\d).{8,}$",
                 message = "Password must contain at least one uppercase letter and one digit")
        private String newPassword;
        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String v) { currentPassword = v; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String v) { newPassword = v; }
    }

    public static class TwoFactorChallengeRequest {
        private String tempToken, code, method, challengeToken;
        public String getTempToken() { return tempToken; }
        public void setTempToken(String v) { tempToken = v; }
        public String getCode() { return code; }
        public void setCode(String v) { code = v; }
        public String getMethod() { return method; }
        public void setMethod(String v) { method = v; }
        public String getChallengeToken() { return challengeToken; }
        public void setChallengeToken(String v) { challengeToken = v; }
    }

    public static class Enable2FARequest {
        @NotBlank private String method;
        public String getMethod() { return method; }
        public void setMethod(String v) { method = v; }
    }

    public static class Verify2FASetupRequest {
        @NotBlank private String code;
        public String getCode() { return code; }
        public void setCode(String v) { code = v; }
    }

    public static class TransactionRequest {
        @NotBlank
        private String description;
        @NotNull
        @Positive
        private BigDecimal amount;
        @NotNull
        private TransactionType type;
        @NotBlank
        private String category;
        @NotNull
        private LocalDate date;
        private String notes;
        private String itemName;
        private String paymentSource;
        private Long cardId;
        private Long bankAccountId;
        private Integer kmReading;
        private Long vehicleId;

        public String getDescription() {
            return description;
        }

        public void setDescription(String v) {
            description = v;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal v) {
            amount = v;
        }

        public TransactionType getType() {
            return type;
        }

        public void setType(TransactionType v) {
            type = v;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String v) {
            category = v;
        }

        public LocalDate getDate() {
            return date;
        }

        public void setDate(LocalDate v) {
            date = v;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String v) {
            notes = v;
        }

        public String getItemName() {
            return itemName;
        }

        public void setItemName(String v) {
            itemName = v;
        }

        public String getPaymentSource() { return paymentSource; }
        public void setPaymentSource(String v) { paymentSource = v; }
        public Long getCardId() { return cardId; }
        public void setCardId(Long v) { cardId = v; }
        public Long getBankAccountId() { return bankAccountId; }
        public void setBankAccountId(Long v) { bankAccountId = v; }
        public Integer getKmReading() { return kmReading; }
        public void setKmReading(Integer v) { kmReading = v; }
        public Long getVehicleId() { return vehicleId; }
        public void setVehicleId(Long v) { vehicleId = v; }
    }

    public static class TransactionResponse {
        private Long id;
        private String description, category, notes, itemName;
        private BigDecimal amount;
        private TransactionType type;
        private LocalDate date;
        private String paymentSource;
        private Long cardId;
        private Long bankAccountId;
        private Integer kmReading;
        private Long vehicleId;

        public Long getId() {
            return id;
        }

        public void setId(Long v) {
            id = v;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String v) {
            description = v;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal v) {
            amount = v;
        }

        public TransactionType getType() {
            return type;
        }

        public void setType(TransactionType v) {
            type = v;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String v) {
            category = v;
        }

        public LocalDate getDate() {
            return date;
        }

        public void setDate(LocalDate v) {
            date = v;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String v) {
            notes = v;
        }

        public String getItemName() {
            return itemName;
        }

        public void setItemName(String v) {
            itemName = v;
        }

        public String getPaymentSource() { return paymentSource; }
        public void setPaymentSource(String v) { paymentSource = v; }
        public Long getCardId() { return cardId; }
        public void setCardId(Long v) { cardId = v; }
        public Long getBankAccountId() { return bankAccountId; }
        public void setBankAccountId(Long v) { bankAccountId = v; }
        public Integer getKmReading() { return kmReading; }
        public void setKmReading(Integer v) { kmReading = v; }
        public Long getVehicleId() { return vehicleId; }
        public void setVehicleId(Long v) { vehicleId = v; }
    }

    public static class BudgetRequest {
        @NotBlank
        private String category;
        @NotNull
        @Positive
        private BigDecimal limitAmount;
        @NotNull
        @Min(1)
        @Max(12)
        private Integer month;
        @NotNull
        private Integer year;

        public String getCategory() {
            return category;
        }

        public void setCategory(String v) {
            category = v;
        }

        public BigDecimal getLimitAmount() {
            return limitAmount;
        }

        public void setLimitAmount(BigDecimal v) {
            limitAmount = v;
        }

        public Integer getMonth() {
            return month;
        }

        public void setMonth(Integer v) {
            month = v;
        }

        public Integer getYear() {
            return year;
        }

        public void setYear(Integer v) {
            year = v;
        }
    }

    public static class BudgetResponse {
        private Long id;
        private String category;
        private BigDecimal limitAmount, spent;
        private Integer month, year;

        public Long getId() {
            return id;
        }

        public void setId(Long v) {
            id = v;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String v) {
            category = v;
        }

        public BigDecimal getLimitAmount() {
            return limitAmount;
        }

        public void setLimitAmount(BigDecimal v) {
            limitAmount = v;
        }

        public BigDecimal getSpent() {
            return spent;
        }

        public void setSpent(BigDecimal v) {
            spent = v;
        }

        public Integer getMonth() {
            return month;
        }

        public void setMonth(Integer v) {
            month = v;
        }

        public Integer getYear() {
            return year;
        }

        public void setYear(Integer v) {
            year = v;
        }
    }

    public static class BudgetUpdateRequest {
        @NotNull
        @Positive
        private BigDecimal limitAmount;

        public BigDecimal getLimitAmount() { return limitAmount; }
        public void setLimitAmount(BigDecimal v) { limitAmount = v; }
    }

    public static class CategoryResponse {
        private Long id;
        private String name;

        public CategoryResponse(Long id, String name) { this.id = id; this.name = name; }

        public Long getId() { return id; }
        public String getName() { return name; }
    }

    public static class CategoryRequest {
        @NotBlank
        private String name;

        public String getName() { return name; }
        public void setName(String v) { name = v; }
    }

    public static class ItemResponse {
        private Long id;
        private String name;
        private Long categoryId;
        private String categoryName;
        private boolean favorite;

        public ItemResponse(Long id, String name, Long categoryId, String categoryName, boolean favorite) {
            this.id = id; this.name = name; this.categoryId = categoryId; this.categoryName = categoryName;
            this.favorite = favorite;
        }

        public Long getId() { return id; }
        public String getName() { return name; }
        public Long getCategoryId() { return categoryId; }
        public String getCategoryName() { return categoryName; }
        public boolean isFavorite() { return favorite; }
    }

    public static class ItemRequest {
        @NotBlank
        private String name;
        @NotNull
        private Long categoryId;

        public String getName() { return name; }
        public void setName(String v) { name = v; }
        public Long getCategoryId() { return categoryId; }
        public void setCategoryId(Long v) { categoryId = v; }
    }

    public static class AnnualBudgetRequest {
        @NotBlank
        private String category;
        @NotNull
        @Positive
        private BigDecimal monthlyBudget;
        @NotNull
        private Integer year;

        public String getCategory() { return category; }
        public void setCategory(String v) { category = v; }
        public BigDecimal getMonthlyBudget() { return monthlyBudget; }
        public void setMonthlyBudget(BigDecimal v) { monthlyBudget = v; }
        public Integer getYear() { return year; }
        public void setYear(Integer v) { year = v; }
    }

    public static class MonthData {
        private BigDecimal utilised;
        private BigDecimal remaining;
        private double pct;

        public MonthData(BigDecimal utilised, BigDecimal remaining, double pct) {
            this.utilised = utilised; this.remaining = remaining; this.pct = pct;
        }

        public BigDecimal getUtilised() { return utilised; }
        public BigDecimal getRemaining() { return remaining; }
        public double getPct() { return pct; }
    }

    public static class AnnualCategoryRow {
        private String category;
        private Map<Integer, MonthData> months;
        private Map<Integer, Long> budgetIds;
        private Map<Integer, BigDecimal> monthlyBudgets;
        private BigDecimal totalBudgeted;
        private BigDecimal totalUtilised;
        private double ytdPct;

        public String getCategory() { return category; }
        public void setCategory(String v) { category = v; }
        public Map<Integer, MonthData> getMonths() { return months; }
        public void setMonths(Map<Integer, MonthData> v) { months = v; }
        public Map<Integer, Long> getBudgetIds() { return budgetIds; }
        public void setBudgetIds(Map<Integer, Long> v) { budgetIds = v; }
        public Map<Integer, BigDecimal> getMonthlyBudgets() { return monthlyBudgets; }
        public void setMonthlyBudgets(Map<Integer, BigDecimal> v) { monthlyBudgets = v; }
        public BigDecimal getTotalBudgeted() { return totalBudgeted; }
        public void setTotalBudgeted(BigDecimal v) { totalBudgeted = v; }
        public BigDecimal getTotalUtilised() { return totalUtilised; }
        public void setTotalUtilised(BigDecimal v) { totalUtilised = v; }
        public double getYtdPct() { return ytdPct; }
        public void setYtdPct(double v) { ytdPct = v; }
    }

    public static class AnnualBudgetResponse {
        private int year;
        private List<AnnualCategoryRow> categories;
        private BigDecimal grandTotalBudgeted;
        private BigDecimal grandTotalUtilised;
        private double overallPct;

        public int getYear() { return year; }
        public void setYear(int v) { year = v; }
        public List<AnnualCategoryRow> getCategories() { return categories; }
        public void setCategories(List<AnnualCategoryRow> v) { categories = v; }
        public BigDecimal getGrandTotalBudgeted() { return grandTotalBudgeted; }
        public void setGrandTotalBudgeted(BigDecimal v) { grandTotalBudgeted = v; }
        public BigDecimal getGrandTotalUtilised() { return grandTotalUtilised; }
        public void setGrandTotalUtilised(BigDecimal v) { grandTotalUtilised = v; }
        public double getOverallPct() { return overallPct; }
        public void setOverallPct(double v) { overallPct = v; }
    }

    public static class CreditCardRequest {
        @NotBlank private String name;
        private String bank;
        private BigDecimal creditLimit;
        private Integer billingDate;
        private Integer paymentDueDate;
        private String lastFourDigits;
        private String cardType;
        private LocalDate balanceDate;
        private BigDecimal openingOutstanding;
        public String getName() { return name; }
        public void setName(String v) { name = v; }
        public String getBank() { return bank; }
        public void setBank(String v) { bank = v; }
        public BigDecimal getCreditLimit() { return creditLimit; }
        public void setCreditLimit(BigDecimal v) { creditLimit = v; }
        public Integer getBillingDate() { return billingDate; }
        public void setBillingDate(Integer v) { billingDate = v; }
        public Integer getPaymentDueDate() { return paymentDueDate; }
        public void setPaymentDueDate(Integer v) { paymentDueDate = v; }
        public String getLastFourDigits() { return lastFourDigits; }
        public void setLastFourDigits(String v) { lastFourDigits = v; }
        public String getCardType() { return cardType; }
        public void setCardType(String v) { cardType = v; }
        public LocalDate getBalanceDate() { return balanceDate; }
        public void setBalanceDate(LocalDate v) { balanceDate = v; }
        public BigDecimal getOpeningOutstanding() { return openingOutstanding; }
        public void setOpeningOutstanding(BigDecimal v) { openingOutstanding = v; }
    }

    public static class CreditCardResponse {
        private Long id;
        private String name, bank, lastFourDigits, cardType;
        private BigDecimal creditLimit, outstanding, openingOutstanding;
        private Integer billingDate, paymentDueDate;
        private LocalDate balanceDate;
        public Long getId() { return id; }
        public void setId(Long v) { id = v; }
        public String getName() { return name; }
        public void setName(String v) { name = v; }
        public String getBank() { return bank; }
        public void setBank(String v) { bank = v; }
        public BigDecimal getCreditLimit() { return creditLimit; }
        public void setCreditLimit(BigDecimal v) { creditLimit = v; }
        public BigDecimal getOutstanding() { return outstanding; }
        public void setOutstanding(BigDecimal v) { outstanding = v; }
        public BigDecimal getOpeningOutstanding() { return openingOutstanding; }
        public void setOpeningOutstanding(BigDecimal v) { openingOutstanding = v; }
        public Integer getBillingDate() { return billingDate; }
        public void setBillingDate(Integer v) { billingDate = v; }
        public Integer getPaymentDueDate() { return paymentDueDate; }
        public void setPaymentDueDate(Integer v) { paymentDueDate = v; }
        public String getLastFourDigits() { return lastFourDigits; }
        public void setLastFourDigits(String v) { lastFourDigits = v; }
        public String getCardType() { return cardType; }
        public void setCardType(String v) { cardType = v; }
        public LocalDate getBalanceDate() { return balanceDate; }
        public void setBalanceDate(LocalDate v) { balanceDate = v; }
    }

    public static class BankAccountRequest {
        @NotBlank private String name;
        private String bankName;
        @NotBlank private String accountType;
        @NotNull private BigDecimal openingBalance;
        @JsonProperty("isDefault") private boolean isDefault;
        @JsonProperty("emergencyFund") private boolean emergencyFund;
        private LocalDate balanceDate;
        public String getName() { return name; }
        public void setName(String v) { name = v; }
        public String getBankName() { return bankName; }
        public void setBankName(String v) { bankName = v; }
        public String getAccountType() { return accountType; }
        public void setAccountType(String v) { accountType = v; }
        public BigDecimal getOpeningBalance() { return openingBalance; }
        public void setOpeningBalance(BigDecimal v) { openingBalance = v; }
        public boolean isDefault() { return isDefault; }
        public void setDefault(boolean v) { isDefault = v; }
        public boolean isEmergencyFund() { return emergencyFund; }
        public void setEmergencyFund(boolean v) { emergencyFund = v; }
        public LocalDate getBalanceDate() { return balanceDate; }
        public void setBalanceDate(LocalDate v) { balanceDate = v; }
    }

    public static class BankAccountResponse {
        private Long id;
        private String name, bankName, accountType;
        private BigDecimal openingBalance, currentBalance, totalInflow, totalOutflow;
        @JsonProperty("isDefault") private boolean isDefault;
        @JsonProperty("emergencyFund") private boolean emergencyFund;
        private LocalDate balanceDate;
        public Long getId() { return id; }
        public void setId(Long v) { id = v; }
        public String getName() { return name; }
        public void setName(String v) { name = v; }
        public String getBankName() { return bankName; }
        public void setBankName(String v) { bankName = v; }
        public String getAccountType() { return accountType; }
        public void setAccountType(String v) { accountType = v; }
        public BigDecimal getOpeningBalance() { return openingBalance; }
        public void setOpeningBalance(BigDecimal v) { openingBalance = v; }
        public BigDecimal getCurrentBalance() { return currentBalance; }
        public void setCurrentBalance(BigDecimal v) { currentBalance = v; }
        public BigDecimal getTotalInflow() { return totalInflow; }
        public void setTotalInflow(BigDecimal v) { totalInflow = v; }
        public BigDecimal getTotalOutflow() { return totalOutflow; }
        public void setTotalOutflow(BigDecimal v) { totalOutflow = v; }
        public boolean isDefault() { return isDefault; }
        public void setDefault(boolean v) { isDefault = v; }
        public boolean isEmergencyFund() { return emergencyFund; }
        public void setEmergencyFund(boolean v) { emergencyFund = v; }
        public LocalDate getBalanceDate() { return balanceDate; }
        public void setBalanceDate(LocalDate v) { balanceDate = v; }
    }

    public static class VehicleRequest {
        @NotBlank private String name;
        private String type;
        private Integer serviceIntervalKm;
        public String getName() { return name; }
        public void setName(String v) { name = v; }
        public String getType() { return type; }
        public void setType(String v) { type = v; }
        public Integer getServiceIntervalKm() { return serviceIntervalKm; }
        public void setServiceIntervalKm(Integer v) { serviceIntervalKm = v; }
    }

    public static class VehicleResponse {
        private Long id;
        private String name, type;
        private Integer serviceIntervalKm;
        public Long getId() { return id; }
        public void setId(Long v) { id = v; }
        public String getName() { return name; }
        public void setName(String v) { name = v; }
        public String getType() { return type; }
        public void setType(String v) { type = v; }
        public Integer getServiceIntervalKm() { return serviceIntervalKm; }
        public void setServiceIntervalKm(Integer v) { serviceIntervalKm = v; }
    }

    public static class VehicleLogRequest {
        @NotNull private Long vehicleId;
        @NotNull private LocalDate date;
        @NotNull private Integer kmAtService;
        private String serviceType;
        private BigDecimal cost;
        private String notes;
        public Long getVehicleId() { return vehicleId; }
        public void setVehicleId(Long v) { vehicleId = v; }
        public LocalDate getDate() { return date; }
        public void setDate(LocalDate v) { date = v; }
        public Integer getKmAtService() { return kmAtService; }
        public void setKmAtService(Integer v) { kmAtService = v; }
        public String getServiceType() { return serviceType; }
        public void setServiceType(String v) { serviceType = v; }
        public BigDecimal getCost() { return cost; }
        public void setCost(BigDecimal v) { cost = v; }
        public String getNotes() { return notes; }
        public void setNotes(String v) { notes = v; }
    }

    public static class VehicleLogResponse {
        private Long id, vehicleId;
        private String vehicleName, serviceType, notes;
        private LocalDate date;
        private Integer kmAtService, nextServiceKm;
        private BigDecimal cost;
        public Long getId() { return id; }
        public void setId(Long v) { id = v; }
        public Long getVehicleId() { return vehicleId; }
        public void setVehicleId(Long v) { vehicleId = v; }
        public String getVehicleName() { return vehicleName; }
        public void setVehicleName(String v) { vehicleName = v; }
        public String getServiceType() { return serviceType; }
        public void setServiceType(String v) { serviceType = v; }
        public String getNotes() { return notes; }
        public void setNotes(String v) { notes = v; }
        public LocalDate getDate() { return date; }
        public void setDate(LocalDate v) { date = v; }
        public Integer getKmAtService() { return kmAtService; }
        public void setKmAtService(Integer v) { kmAtService = v; }
        public Integer getNextServiceKm() { return nextServiceKm; }
        public void setNextServiceKm(Integer v) { nextServiceKm = v; }
        public BigDecimal getCost() { return cost; }
        public void setCost(BigDecimal v) { cost = v; }
    }

    public static class PivotItemRow {
        private String name;
        private Map<Integer, Double> months;
        private double total;
        public String getName() { return name; }
        public void setName(String v) { name = v; }
        public Map<Integer, Double> getMonths() { return months; }
        public void setMonths(Map<Integer, Double> v) { months = v; }
        public double getTotal() { return total; }
        public void setTotal(double v) { total = v; }
    }

    public static class PivotCategoryRow {
        private String name;
        private List<PivotItemRow> items;
        private Map<Integer, Double> monthlyTotals;
        private double total;
        public String getName() { return name; }
        public void setName(String v) { name = v; }
        public List<PivotItemRow> getItems() { return items; }
        public void setItems(List<PivotItemRow> v) { items = v; }
        public Map<Integer, Double> getMonthlyTotals() { return monthlyTotals; }
        public void setMonthlyTotals(Map<Integer, Double> v) { monthlyTotals = v; }
        public double getTotal() { return total; }
        public void setTotal(double v) { total = v; }
    }

    public static class PivotResponse {
        private List<PivotCategoryRow> categories;
        private Map<Integer, Double> grandMonthlyTotals;
        private double grandTotal;
        public List<PivotCategoryRow> getCategories() { return categories; }
        public void setCategories(List<PivotCategoryRow> v) { categories = v; }
        public Map<Integer, Double> getGrandMonthlyTotals() { return grandMonthlyTotals; }
        public void setGrandMonthlyTotals(Map<Integer, Double> v) { grandMonthlyTotals = v; }
        public double getGrandTotal() { return grandTotal; }
        public void setGrandTotal(double v) { grandTotal = v; }
    }

    public static class SummaryResponse {
        private BigDecimal totalIncome, totalExpenses, balance, monthlyIncome, monthlyExpenses;

        public BigDecimal getTotalIncome() {
            return totalIncome;
        }

        public void setTotalIncome(BigDecimal v) {
            totalIncome = v;
        }

        public BigDecimal getTotalExpenses() {
            return totalExpenses;
        }

        public void setTotalExpenses(BigDecimal v) {
            totalExpenses = v;
        }

        public BigDecimal getBalance() {
            return balance;
        }

        public void setBalance(BigDecimal v) {
            balance = v;
        }

        public BigDecimal getMonthlyIncome() {
            return monthlyIncome;
        }

        public void setMonthlyIncome(BigDecimal v) {
            monthlyIncome = v;
        }

        public BigDecimal getMonthlyExpenses() {
            return monthlyExpenses;
        }

        public void setMonthlyExpenses(BigDecimal v) {
            monthlyExpenses = v;
        }
    }

    // ─── Chit Tracker DTOs ───────────────────────────────────────────────────

    public static class ChitGroupRequest {
        @NotBlank
        private String name;
        @NotBlank
        private String groupLabel;
        @NotNull @Min(1)
        private Integer membersCount;
        @NotNull @Min(1) @Max(2)
        private Integer totalBatches;
        @NotNull @Min(1)
        private Integer membersPerBatch;
        @NotNull @Positive
        private BigDecimal monthlyAmount;
        private BigDecimal basicInterest;
        private BigDecimal companyCommission;
        @NotNull
        private LocalDate startDate;
        private String status; // ACTIVE | COMPLETED
        private String notes;

        public String getName() { return name; }
        public void setName(String v) { name = v; }
        public String getGroupLabel() { return groupLabel; }
        public void setGroupLabel(String v) { groupLabel = v; }
        public Integer getMembersCount() { return membersCount; }
        public void setMembersCount(Integer v) { membersCount = v; }
        public Integer getTotalBatches() { return totalBatches; }
        public void setTotalBatches(Integer v) { totalBatches = v; }
        public Integer getMembersPerBatch() { return membersPerBatch; }
        public void setMembersPerBatch(Integer v) { membersPerBatch = v; }
        public BigDecimal getMonthlyAmount() { return monthlyAmount; }
        public void setMonthlyAmount(BigDecimal v) { monthlyAmount = v; }
        public BigDecimal getBasicInterest() { return basicInterest; }
        public void setBasicInterest(BigDecimal v) { basicInterest = v; }
        public BigDecimal getCompanyCommission() { return companyCommission; }
        public void setCompanyCommission(BigDecimal v) { companyCommission = v; }
        public LocalDate getStartDate() { return startDate; }
        public void setStartDate(LocalDate v) { startDate = v; }
        public String getStatus() { return status; }
        public void setStatus(String v) { status = v; }
        public String getNotes() { return notes; }
        public void setNotes(String v) { notes = v; }
    }

    public static class ChitGroupResponse {
        private Long id;
        private String name;
        private String groupLabel;
        private Integer membersCount;
        private Integer totalBatches;
        private Integer membersPerBatch;
        private BigDecimal monthlyAmount;
        private BigDecimal basicInterest;
        private BigDecimal companyCommission;
        private LocalDate startDate;
        private String status;
        private String notes;
        private BigDecimal totalAmount; // membersCount * monthlyAmount
        private BigDecimal totalPaid;   // sum of all monthly amounts paid so far
        private BigDecimal totalReceived; // sum of amountTaken across batches
        private BigDecimal totalKasir;  // sum of all kasirPerMonth values across all batches
        private java.util.List<ChitBatchResponse> batches;

        public Long getId() { return id; }
        public void setId(Long v) { id = v; }
        public String getName() { return name; }
        public void setName(String v) { name = v; }
        public String getGroupLabel() { return groupLabel; }
        public void setGroupLabel(String v) { groupLabel = v; }
        public Integer getMembersCount() { return membersCount; }
        public void setMembersCount(Integer v) { membersCount = v; }
        public Integer getTotalBatches() { return totalBatches; }
        public void setTotalBatches(Integer v) { totalBatches = v; }
        public Integer getMembersPerBatch() { return membersPerBatch; }
        public void setMembersPerBatch(Integer v) { membersPerBatch = v; }
        public BigDecimal getMonthlyAmount() { return monthlyAmount; }
        public void setMonthlyAmount(BigDecimal v) { monthlyAmount = v; }
        public BigDecimal getBasicInterest() { return basicInterest; }
        public void setBasicInterest(BigDecimal v) { basicInterest = v; }
        public BigDecimal getCompanyCommission() { return companyCommission; }
        public void setCompanyCommission(BigDecimal v) { companyCommission = v; }
        public LocalDate getStartDate() { return startDate; }
        public void setStartDate(LocalDate v) { startDate = v; }
        public String getStatus() { return status; }
        public void setStatus(String v) { status = v; }
        public String getNotes() { return notes; }
        public void setNotes(String v) { notes = v; }
        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal v) { totalAmount = v; }
        public BigDecimal getTotalPaid() { return totalPaid; }
        public void setTotalPaid(BigDecimal v) { totalPaid = v; }
        public BigDecimal getTotalReceived() { return totalReceived; }
        public void setTotalReceived(BigDecimal v) { totalReceived = v; }
        public BigDecimal getTotalKasir() { return totalKasir; }
        public void setTotalKasir(BigDecimal v) { totalKasir = v; }
        public java.util.List<ChitBatchResponse> getBatches() { return batches; }
        public void setBatches(java.util.List<ChitBatchResponse> v) { batches = v; }
    }

    public static class ChitBatchResponse {
        private Long id;
        private Integer batchNumber;
        private LocalDate dateTaken;
        private BigDecimal amountTaken;
        private java.util.List<ChitMonthlyEntryResponse> monthlyEntries;

        public Long getId() { return id; }
        public void setId(Long v) { id = v; }
        public Integer getBatchNumber() { return batchNumber; }
        public void setBatchNumber(Integer v) { batchNumber = v; }
        public LocalDate getDateTaken() { return dateTaken; }
        public void setDateTaken(LocalDate v) { dateTaken = v; }
        public BigDecimal getAmountTaken() { return amountTaken; }
        public void setAmountTaken(BigDecimal v) { amountTaken = v; }
        public java.util.List<ChitMonthlyEntryResponse> getMonthlyEntries() { return monthlyEntries; }
        public void setMonthlyEntries(java.util.List<ChitMonthlyEntryResponse> v) { monthlyEntries = v; }
    }

    public static class ChitBatchUpdateRequest {
        private LocalDate dateTaken;
        private BigDecimal amountTaken;

        public LocalDate getDateTaken() { return dateTaken; }
        public void setDateTaken(LocalDate v) { dateTaken = v; }
        public BigDecimal getAmountTaken() { return amountTaken; }
        public void setAmountTaken(BigDecimal v) { amountTaken = v; }
    }

    public static class ChitMonthlyEntryResponse {
        private Long id;
        private Integer monthNumber;
        private LocalDate monthDate;
        private BigDecimal amountPerMonth;
        private BigDecimal kasirPerMonth;
        private BigDecimal companyYelam;
        private BigDecimal thalliEduthathu;

        public Long getId() { return id; }
        public void setId(Long v) { id = v; }
        public Integer getMonthNumber() { return monthNumber; }
        public void setMonthNumber(Integer v) { monthNumber = v; }
        public LocalDate getMonthDate() { return monthDate; }
        public void setMonthDate(LocalDate v) { monthDate = v; }
        public BigDecimal getAmountPerMonth() { return amountPerMonth; }
        public void setAmountPerMonth(BigDecimal v) { amountPerMonth = v; }
        public BigDecimal getKasirPerMonth() { return kasirPerMonth; }
        public void setKasirPerMonth(BigDecimal v) { kasirPerMonth = v; }
        public BigDecimal getCompanyYelam() { return companyYelam; }
        public void setCompanyYelam(BigDecimal v) { companyYelam = v; }
        public BigDecimal getThalliEduthathu() { return thalliEduthathu; }
        public void setThalliEduthathu(BigDecimal v) { thalliEduthathu = v; }
    }

    public static class ChitKasirUpdateRequest {
        private BigDecimal kasirPerMonth;

        public BigDecimal getKasirPerMonth() { return kasirPerMonth; }
        public void setKasirPerMonth(BigDecimal v) { kasirPerMonth = v; }
    }

    // ─── Debt Tracker DTOs ────────────────────────────────────────────────────

    // ── Requests ──

    public static class EmiLoanRequest {
        private String loanId, name, status, notes;
        private BigDecimal initialPrincipal, annualInterestRate, gstRate;
        private BigDecimal foreclosureAmount, foreclosurePrincipal, foreclosureInterest;
        private BigDecimal foreclosureCharges, foreclosureChargesGst, foreclosureInterestGst;
        private BigDecimal processingCharge;
        private Integer tenureMonths;
        private LocalDate startDate, foreclosureDate;
        private Boolean foreclosed;

        public String getLoanId() { return loanId; } public void setLoanId(String v) { loanId = v; }
        public String getName() { return name; } public void setName(String v) { name = v; }
        public String getStatus() { return status; } public void setStatus(String v) { status = v; }
        public String getNotes() { return notes; } public void setNotes(String v) { notes = v; }
        public BigDecimal getInitialPrincipal() { return initialPrincipal; } public void setInitialPrincipal(BigDecimal v) { initialPrincipal = v; }
        public BigDecimal getAnnualInterestRate() { return annualInterestRate; } public void setAnnualInterestRate(BigDecimal v) { annualInterestRate = v; }
        public BigDecimal getGstRate() { return gstRate; } public void setGstRate(BigDecimal v) { gstRate = v; }
        public BigDecimal getForeclosureAmount() { return foreclosureAmount; } public void setForeclosureAmount(BigDecimal v) { foreclosureAmount = v; }
        public BigDecimal getForeclosurePrincipal() { return foreclosurePrincipal; } public void setForeclosurePrincipal(BigDecimal v) { foreclosurePrincipal = v; }
        public BigDecimal getForeclosureInterest() { return foreclosureInterest; } public void setForeclosureInterest(BigDecimal v) { foreclosureInterest = v; }
        public BigDecimal getForeclosureCharges() { return foreclosureCharges; } public void setForeclosureCharges(BigDecimal v) { foreclosureCharges = v; }
        public BigDecimal getForeclosureChargesGst() { return foreclosureChargesGst; } public void setForeclosureChargesGst(BigDecimal v) { foreclosureChargesGst = v; }
        public BigDecimal getForeclosureInterestGst() { return foreclosureInterestGst; } public void setForeclosureInterestGst(BigDecimal v) { foreclosureInterestGst = v; }
        public BigDecimal getProcessingCharge() { return processingCharge; } public void setProcessingCharge(BigDecimal v) { processingCharge = v; }
        public Integer getTenureMonths() { return tenureMonths; } public void setTenureMonths(Integer v) { tenureMonths = v; }
        public LocalDate getStartDate() { return startDate; } public void setStartDate(LocalDate v) { startDate = v; }
        public LocalDate getForeclosureDate() { return foreclosureDate; } public void setForeclosureDate(LocalDate v) { foreclosureDate = v; }
        public Boolean getForeclosed() { return foreclosed; } public void setForeclosed(Boolean v) { foreclosed = v; }
    }

    public static class AnnualLoanRequest {
        private String loanId, name, status, notes;
        private BigDecimal initialPrincipal, annualInterestRate, currentBalance;
        private BigDecimal totalInterestAccrued, interestPaid;
        private LocalDate startDate, endDate;

        public String getLoanId() { return loanId; } public void setLoanId(String v) { loanId = v; }
        public String getName() { return name; } public void setName(String v) { name = v; }
        public String getStatus() { return status; } public void setStatus(String v) { status = v; }
        public String getNotes() { return notes; } public void setNotes(String v) { notes = v; }
        public BigDecimal getInitialPrincipal() { return initialPrincipal; } public void setInitialPrincipal(BigDecimal v) { initialPrincipal = v; }
        public BigDecimal getAnnualInterestRate() { return annualInterestRate; } public void setAnnualInterestRate(BigDecimal v) { annualInterestRate = v; }
        public BigDecimal getCurrentBalance() { return currentBalance; } public void setCurrentBalance(BigDecimal v) { currentBalance = v; }
        public BigDecimal getTotalInterestAccrued() { return totalInterestAccrued; } public void setTotalInterestAccrued(BigDecimal v) { totalInterestAccrued = v; }
        public BigDecimal getInterestPaid() { return interestPaid; } public void setInterestPaid(BigDecimal v) { interestPaid = v; }
        public LocalDate getStartDate() { return startDate; } public void setStartDate(LocalDate v) { startDate = v; }
        public LocalDate getEndDate() { return endDate; } public void setEndDate(LocalDate v) { endDate = v; }
    }

    public static class BorrowedLoanRequest {
        private String loanId, lenderName, status, notes;
        private BigDecimal amountBorrowed, amountRepaid;
        private LocalDate dateBorrowed;

        public String getLoanId() { return loanId; } public void setLoanId(String v) { loanId = v; }
        public String getLenderName() { return lenderName; } public void setLenderName(String v) { lenderName = v; }
        public String getStatus() { return status; } public void setStatus(String v) { status = v; }
        public String getNotes() { return notes; } public void setNotes(String v) { notes = v; }
        public BigDecimal getAmountBorrowed() { return amountBorrowed; } public void setAmountBorrowed(BigDecimal v) { amountBorrowed = v; }
        public BigDecimal getAmountRepaid() { return amountRepaid; } public void setAmountRepaid(BigDecimal v) { amountRepaid = v; }
        public LocalDate getDateBorrowed() { return dateBorrowed; } public void setDateBorrowed(LocalDate v) { dateBorrowed = v; }
    }

    public static class PrepaymentRequest {
        private LocalDate paymentDate;
        private BigDecimal amount, interestAccrued;

        public LocalDate getPaymentDate() { return paymentDate; } public void setPaymentDate(LocalDate v) { paymentDate = v; }
        public BigDecimal getAmount() { return amount; } public void setAmount(BigDecimal v) { amount = v; }
        public BigDecimal getInterestAccrued() { return interestAccrued; } public void setInterestAccrued(BigDecimal v) { interestAccrued = v; }
    }

    public static class BorrowedRepaymentRequest {
        private LocalDate paymentDate;
        private BigDecimal amount;
        private String note;

        public LocalDate getPaymentDate() { return paymentDate; } public void setPaymentDate(LocalDate v) { paymentDate = v; }
        public BigDecimal getAmount() { return amount; } public void setAmount(BigDecimal v) { amount = v; }
        public String getNote() { return note; } public void setNote(String v) { note = v; }
    }

    // ── Responses ──

    public static class EmiLoanSummaryResponse {
        private Long id; private String loanId, name, status, notes;
        private BigDecimal initialPrincipal, annualInterestRate, gstRate, baseEmi;
        private BigDecimal principalPaid, interestPaid, gstPaid, outstandingPrincipal, futureInterest;
        private BigDecimal foreclosureAmount, foreclosurePrincipal, foreclosureInterest;
        private BigDecimal foreclosureCharges, foreclosureChargesGst, foreclosureInterestGst;
        private BigDecimal processingCharge, processingChargePaid;
        private Integer tenureMonths;
        private LocalDate startDate, endDate, foreclosureDate;
        private boolean foreclosed;

        public Long getId() { return id; } public void setId(Long v) { id = v; }
        public String getLoanId() { return loanId; } public void setLoanId(String v) { loanId = v; }
        public String getName() { return name; } public void setName(String v) { name = v; }
        public String getStatus() { return status; } public void setStatus(String v) { status = v; }
        public String getNotes() { return notes; } public void setNotes(String v) { notes = v; }
        public BigDecimal getInitialPrincipal() { return initialPrincipal; } public void setInitialPrincipal(BigDecimal v) { initialPrincipal = v; }
        public BigDecimal getAnnualInterestRate() { return annualInterestRate; } public void setAnnualInterestRate(BigDecimal v) { annualInterestRate = v; }
        public BigDecimal getGstRate() { return gstRate; } public void setGstRate(BigDecimal v) { gstRate = v; }
        public BigDecimal getBaseEmi() { return baseEmi; } public void setBaseEmi(BigDecimal v) { baseEmi = v; }
        public BigDecimal getPrincipalPaid() { return principalPaid; } public void setPrincipalPaid(BigDecimal v) { principalPaid = v; }
        public BigDecimal getInterestPaid() { return interestPaid; } public void setInterestPaid(BigDecimal v) { interestPaid = v; }
        public BigDecimal getGstPaid() { return gstPaid; } public void setGstPaid(BigDecimal v) { gstPaid = v; }
        public BigDecimal getOutstandingPrincipal() { return outstandingPrincipal; } public void setOutstandingPrincipal(BigDecimal v) { outstandingPrincipal = v; }
        public BigDecimal getFutureInterest() { return futureInterest; } public void setFutureInterest(BigDecimal v) { futureInterest = v; }
        public BigDecimal getForeclosureAmount() { return foreclosureAmount; } public void setForeclosureAmount(BigDecimal v) { foreclosureAmount = v; }
        public BigDecimal getForeclosurePrincipal() { return foreclosurePrincipal; } public void setForeclosurePrincipal(BigDecimal v) { foreclosurePrincipal = v; }
        public BigDecimal getForeclosureInterest() { return foreclosureInterest; } public void setForeclosureInterest(BigDecimal v) { foreclosureInterest = v; }
        public BigDecimal getForeclosureCharges() { return foreclosureCharges; } public void setForeclosureCharges(BigDecimal v) { foreclosureCharges = v; }
        public BigDecimal getForeclosureChargesGst() { return foreclosureChargesGst; } public void setForeclosureChargesGst(BigDecimal v) { foreclosureChargesGst = v; }
        public BigDecimal getForeclosureInterestGst() { return foreclosureInterestGst; } public void setForeclosureInterestGst(BigDecimal v) { foreclosureInterestGst = v; }
        public BigDecimal getProcessingCharge() { return processingCharge; } public void setProcessingCharge(BigDecimal v) { processingCharge = v; }
        public BigDecimal getProcessingChargePaid() { return processingChargePaid; } public void setProcessingChargePaid(BigDecimal v) { processingChargePaid = v; }
        public Integer getTenureMonths() { return tenureMonths; } public void setTenureMonths(Integer v) { tenureMonths = v; }
        public LocalDate getStartDate() { return startDate; } public void setStartDate(LocalDate v) { startDate = v; }
        public LocalDate getEndDate() { return endDate; } public void setEndDate(LocalDate v) { endDate = v; }
        public LocalDate getForeclosureDate() { return foreclosureDate; } public void setForeclosureDate(LocalDate v) { foreclosureDate = v; }
        public boolean isForeclosed() { return foreclosed; } public void setForeclosed(boolean v) { foreclosed = v; }
    }

    public static class EmiInstallmentResponse {
        private Long id; private Integer installmentNumber;
        private LocalDate dueDate;
        private BigDecimal openingPrincipal, emiAmount, principalPart, interestPart, gstPart, closingPrincipal;
        private BigDecimal processingCharge;
        private boolean paid;

        public Long getId() { return id; } public void setId(Long v) { id = v; }
        public Integer getInstallmentNumber() { return installmentNumber; } public void setInstallmentNumber(Integer v) { installmentNumber = v; }
        public LocalDate getDueDate() { return dueDate; } public void setDueDate(LocalDate v) { dueDate = v; }
        public BigDecimal getOpeningPrincipal() { return openingPrincipal; } public void setOpeningPrincipal(BigDecimal v) { openingPrincipal = v; }
        public BigDecimal getEmiAmount() { return emiAmount; } public void setEmiAmount(BigDecimal v) { emiAmount = v; }
        public BigDecimal getPrincipalPart() { return principalPart; } public void setPrincipalPart(BigDecimal v) { principalPart = v; }
        public BigDecimal getInterestPart() { return interestPart; } public void setInterestPart(BigDecimal v) { interestPart = v; }
        public BigDecimal getGstPart() { return gstPart; } public void setGstPart(BigDecimal v) { gstPart = v; }
        public BigDecimal getClosingPrincipal() { return closingPrincipal; } public void setClosingPrincipal(BigDecimal v) { closingPrincipal = v; }
        public BigDecimal getProcessingCharge() { return processingCharge; } public void setProcessingCharge(BigDecimal v) { processingCharge = v; }
        public boolean isPaid() { return paid; } public void setPaid(boolean v) { paid = v; }
    }

    public static class EmiLoanDetailResponse {
        private EmiLoanSummaryResponse summary;
        private java.util.List<EmiInstallmentResponse> installments;

        public EmiLoanSummaryResponse getSummary() { return summary; } public void setSummary(EmiLoanSummaryResponse v) { summary = v; }
        public java.util.List<EmiInstallmentResponse> getInstallments() { return installments; } public void setInstallments(java.util.List<EmiInstallmentResponse> v) { installments = v; }
    }

    public static class AnnualLoanSummaryResponse {
        private Long id; private String loanId, name, status, notes;
        private BigDecimal initialPrincipal, annualInterestRate, currentBalance;
        private BigDecimal totalInterestAccrued, interestPaid;
        private LocalDate startDate, endDate;

        public Long getId() { return id; } public void setId(Long v) { id = v; }
        public String getLoanId() { return loanId; } public void setLoanId(String v) { loanId = v; }
        public String getName() { return name; } public void setName(String v) { name = v; }
        public String getStatus() { return status; } public void setStatus(String v) { status = v; }
        public String getNotes() { return notes; } public void setNotes(String v) { notes = v; }
        public BigDecimal getInitialPrincipal() { return initialPrincipal; } public void setInitialPrincipal(BigDecimal v) { initialPrincipal = v; }
        public BigDecimal getAnnualInterestRate() { return annualInterestRate; } public void setAnnualInterestRate(BigDecimal v) { annualInterestRate = v; }
        public BigDecimal getCurrentBalance() { return currentBalance; } public void setCurrentBalance(BigDecimal v) { currentBalance = v; }
        public BigDecimal getTotalInterestAccrued() { return totalInterestAccrued; } public void setTotalInterestAccrued(BigDecimal v) { totalInterestAccrued = v; }
        public BigDecimal getInterestPaid() { return interestPaid; } public void setInterestPaid(BigDecimal v) { interestPaid = v; }
        public LocalDate getStartDate() { return startDate; } public void setStartDate(LocalDate v) { startDate = v; }
        public LocalDate getEndDate() { return endDate; } public void setEndDate(LocalDate v) { endDate = v; }
    }

    public static class PrepaymentResponse {
        private Long id; private LocalDate paymentDate; private BigDecimal amount, interestAccrued;

        public Long getId() { return id; } public void setId(Long v) { id = v; }
        public LocalDate getPaymentDate() { return paymentDate; } public void setPaymentDate(LocalDate v) { paymentDate = v; }
        public BigDecimal getAmount() { return amount; } public void setAmount(BigDecimal v) { amount = v; }
        public BigDecimal getInterestAccrued() { return interestAccrued; } public void setInterestAccrued(BigDecimal v) { interestAccrued = v; }
    }

    public static class AnnualLoanDetailResponse {
        private AnnualLoanSummaryResponse summary;
        private java.util.List<PrepaymentResponse> prepayments;

        public AnnualLoanSummaryResponse getSummary() { return summary; } public void setSummary(AnnualLoanSummaryResponse v) { summary = v; }
        public java.util.List<PrepaymentResponse> getPrepayments() { return prepayments; } public void setPrepayments(java.util.List<PrepaymentResponse> v) { prepayments = v; }
    }

    public static class BorrowedLoanSummaryResponse {
        private Long id; private String loanId, lenderName, status, notes;
        private BigDecimal amountBorrowed, amountRepaid, outstandingBalance;
        private LocalDate dateBorrowed;

        public Long getId() { return id; } public void setId(Long v) { id = v; }
        public String getLoanId() { return loanId; } public void setLoanId(String v) { loanId = v; }
        public String getLenderName() { return lenderName; } public void setLenderName(String v) { lenderName = v; }
        public String getStatus() { return status; } public void setStatus(String v) { status = v; }
        public String getNotes() { return notes; } public void setNotes(String v) { notes = v; }
        public BigDecimal getAmountBorrowed() { return amountBorrowed; } public void setAmountBorrowed(BigDecimal v) { amountBorrowed = v; }
        public BigDecimal getAmountRepaid() { return amountRepaid; } public void setAmountRepaid(BigDecimal v) { amountRepaid = v; }
        public BigDecimal getOutstandingBalance() { return outstandingBalance; } public void setOutstandingBalance(BigDecimal v) { outstandingBalance = v; }
        public LocalDate getDateBorrowed() { return dateBorrowed; } public void setDateBorrowed(LocalDate v) { dateBorrowed = v; }
    }

    public static class BorrowedRepaymentResponse {
        private Long id; private LocalDate paymentDate; private BigDecimal amount; private String note;

        public Long getId() { return id; } public void setId(Long v) { id = v; }
        public LocalDate getPaymentDate() { return paymentDate; } public void setPaymentDate(LocalDate v) { paymentDate = v; }
        public BigDecimal getAmount() { return amount; } public void setAmount(BigDecimal v) { amount = v; }
        public String getNote() { return note; } public void setNote(String v) { note = v; }
    }

    public static class BorrowedLoanDetailResponse {
        private BorrowedLoanSummaryResponse summary;
        private java.util.List<BorrowedRepaymentResponse> repayments;

        public BorrowedLoanSummaryResponse getSummary() { return summary; } public void setSummary(BorrowedLoanSummaryResponse v) { summary = v; }
        public java.util.List<BorrowedRepaymentResponse> getRepayments() { return repayments; } public void setRepayments(java.util.List<BorrowedRepaymentResponse> v) { repayments = v; }
    }

    // ─── Investments (RD / FD) ────────────────────────────────────────────────

    public static class RdFdRequest {
        @NotBlank private String type;          // RD | FD
        @NotBlank private String name;
        private String bankName;
        @NotNull @Positive private BigDecimal amount;          // FD=principal, RD=monthly installment
        @NotNull @Positive private BigDecimal annualInterestRate; // percent, e.g. 6.5
        @NotNull @Min(1) private Integer tenureMonths;
        @NotNull private LocalDate startDate;
        private boolean emergencyFund;
        private String status;
        private String notes;

        public String getType() { return type; } public void setType(String v) { type = v; }
        public String getName() { return name; } public void setName(String v) { name = v; }
        public String getBankName() { return bankName; } public void setBankName(String v) { bankName = v; }
        public BigDecimal getAmount() { return amount; } public void setAmount(BigDecimal v) { amount = v; }
        public BigDecimal getAnnualInterestRate() { return annualInterestRate; } public void setAnnualInterestRate(BigDecimal v) { annualInterestRate = v; }
        public Integer getTenureMonths() { return tenureMonths; } public void setTenureMonths(Integer v) { tenureMonths = v; }
        public LocalDate getStartDate() { return startDate; } public void setStartDate(LocalDate v) { startDate = v; }
        public boolean isEmergencyFund() { return emergencyFund; } public void setEmergencyFund(boolean v) { emergencyFund = v; }
        public String getStatus() { return status; } public void setStatus(String v) { status = v; }
        public String getNotes() { return notes; } public void setNotes(String v) { notes = v; }
    }

    public static class RdMonthlyPaymentRequest {
        @NotNull private Integer monthNumber;
        private LocalDate paymentDate;
        private BigDecimal amountPaid;
        private String notes;

        public Integer getMonthNumber() { return monthNumber; } public void setMonthNumber(Integer v) { monthNumber = v; }
        public LocalDate getPaymentDate() { return paymentDate; } public void setPaymentDate(LocalDate v) { paymentDate = v; }
        public BigDecimal getAmountPaid() { return amountPaid; } public void setAmountPaid(BigDecimal v) { amountPaid = v; }
        public String getNotes() { return notes; } public void setNotes(String v) { notes = v; }
    }

    public static class RdMonthlyPaymentResponse {
        private Long id;
        private Integer monthNumber;
        private LocalDate paymentDate;
        private BigDecimal amountPaid;
        private String notes;

        public Long getId() { return id; } public void setId(Long v) { id = v; }
        public Integer getMonthNumber() { return monthNumber; } public void setMonthNumber(Integer v) { monthNumber = v; }
        public LocalDate getPaymentDate() { return paymentDate; } public void setPaymentDate(LocalDate v) { paymentDate = v; }
        public BigDecimal getAmountPaid() { return amountPaid; } public void setAmountPaid(BigDecimal v) { amountPaid = v; }
        public String getNotes() { return notes; } public void setNotes(String v) { notes = v; }
    }

    public static class RdFdResponse {
        private Long id;
        private String type;
        private String name;
        private String bankName;
        private BigDecimal amount;
        private BigDecimal annualInterestRate;
        private Integer tenureMonths;
        private LocalDate startDate;
        private LocalDate maturityDate;
        private boolean emergencyFund;
        private String status;
        private String notes;
        // computed
        private BigDecimal totalInvested;       // FD=amount; RD=amount×tenureMonths
        private BigDecimal maturityAmount;      // total at end (principal + interest)
        private BigDecimal interestEarned;      // maturityAmount - totalInvested
        private BigDecimal currentValue;        // value as of today (partially elapsed)
        private BigDecimal efPrincipal;         // principal for EF view (no interest)
        private int monthsPaid;                 // RD only
        private List<RdMonthlyPaymentResponse> payments; // RD only

        public Long getId() { return id; } public void setId(Long v) { id = v; }
        public String getType() { return type; } public void setType(String v) { type = v; }
        public String getName() { return name; } public void setName(String v) { name = v; }
        public String getBankName() { return bankName; } public void setBankName(String v) { bankName = v; }
        public BigDecimal getAmount() { return amount; } public void setAmount(BigDecimal v) { amount = v; }
        public BigDecimal getAnnualInterestRate() { return annualInterestRate; } public void setAnnualInterestRate(BigDecimal v) { annualInterestRate = v; }
        public Integer getTenureMonths() { return tenureMonths; } public void setTenureMonths(Integer v) { tenureMonths = v; }
        public LocalDate getStartDate() { return startDate; } public void setStartDate(LocalDate v) { startDate = v; }
        public LocalDate getMaturityDate() { return maturityDate; } public void setMaturityDate(LocalDate v) { maturityDate = v; }
        public boolean isEmergencyFund() { return emergencyFund; } public void setEmergencyFund(boolean v) { emergencyFund = v; }
        public String getStatus() { return status; } public void setStatus(String v) { status = v; }
        public String getNotes() { return notes; } public void setNotes(String v) { notes = v; }
        public BigDecimal getTotalInvested() { return totalInvested; } public void setTotalInvested(BigDecimal v) { totalInvested = v; }
        public BigDecimal getMaturityAmount() { return maturityAmount; } public void setMaturityAmount(BigDecimal v) { maturityAmount = v; }
        public BigDecimal getInterestEarned() { return interestEarned; } public void setInterestEarned(BigDecimal v) { interestEarned = v; }
        public BigDecimal getCurrentValue() { return currentValue; } public void setCurrentValue(BigDecimal v) { currentValue = v; }
        public BigDecimal getEfPrincipal() { return efPrincipal; } public void setEfPrincipal(BigDecimal v) { efPrincipal = v; }
        public int getMonthsPaid() { return monthsPaid; } public void setMonthsPaid(int v) { monthsPaid = v; }
        public List<RdMonthlyPaymentResponse> getPayments() { return payments; } public void setPayments(List<RdMonthlyPaymentResponse> v) { payments = v; }
    }

    public static class InvestmentDashboardResponse {
        private BigDecimal totalInvested;
        private BigDecimal totalMaturityValue;
        private BigDecimal totalInterestEarned;
        private BigDecimal emergencyFundTotal;   // principal only of EF investments
        private int activeCount;
        private List<RdFdResponse> fdList;
        private List<RdFdResponse> rdList;

        public BigDecimal getTotalInvested() { return totalInvested; } public void setTotalInvested(BigDecimal v) { totalInvested = v; }
        public BigDecimal getTotalMaturityValue() { return totalMaturityValue; } public void setTotalMaturityValue(BigDecimal v) { totalMaturityValue = v; }
        public BigDecimal getTotalInterestEarned() { return totalInterestEarned; } public void setTotalInterestEarned(BigDecimal v) { totalInterestEarned = v; }
        public BigDecimal getEmergencyFundTotal() { return emergencyFundTotal; } public void setEmergencyFundTotal(BigDecimal v) { emergencyFundTotal = v; }
        public int getActiveCount() { return activeCount; } public void setActiveCount(int v) { activeCount = v; }
        public List<RdFdResponse> getFdList() { return fdList; } public void setFdList(List<RdFdResponse> v) { fdList = v; }
        public List<RdFdResponse> getRdList() { return rdList; } public void setRdList(List<RdFdResponse> v) { rdList = v; }
    }

    public static class DebtDashboardResponse {
        private BigDecimal totalInitialPrincipal, totalOutstanding, monthlyEmiOutflow;
        private double debtFreeProgress;
        private java.util.List<EmiLoanSummaryResponse> emiLoans;
        private java.util.List<AnnualLoanSummaryResponse> annualLoans;
        private java.util.List<BorrowedLoanSummaryResponse> borrowedLoans;

        public BigDecimal getTotalInitialPrincipal() { return totalInitialPrincipal; } public void setTotalInitialPrincipal(BigDecimal v) { totalInitialPrincipal = v; }
        public BigDecimal getTotalOutstanding() { return totalOutstanding; } public void setTotalOutstanding(BigDecimal v) { totalOutstanding = v; }
        public BigDecimal getMonthlyEmiOutflow() { return monthlyEmiOutflow; } public void setMonthlyEmiOutflow(BigDecimal v) { monthlyEmiOutflow = v; }
        public double getDebtFreeProgress() { return debtFreeProgress; } public void setDebtFreeProgress(double v) { debtFreeProgress = v; }
        public java.util.List<EmiLoanSummaryResponse> getEmiLoans() { return emiLoans; } public void setEmiLoans(java.util.List<EmiLoanSummaryResponse> v) { emiLoans = v; }
        public java.util.List<AnnualLoanSummaryResponse> getAnnualLoans() { return annualLoans; } public void setAnnualLoans(java.util.List<AnnualLoanSummaryResponse> v) { annualLoans = v; }
        public java.util.List<BorrowedLoanSummaryResponse> getBorrowedLoans() { return borrowedLoans; } public void setBorrowedLoans(java.util.List<BorrowedLoanSummaryResponse> v) { borrowedLoans = v; }
    }
}
