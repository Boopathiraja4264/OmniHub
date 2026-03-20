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

        public ItemResponse(Long id, String name, Long categoryId, String categoryName) {
            this.id = id; this.name = name; this.categoryId = categoryId; this.categoryName = categoryName;
        }

        public Long getId() { return id; }
        public String getName() { return name; }
        public Long getCategoryId() { return categoryId; }
        public String getCategoryName() { return categoryName; }
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
    }

    public static class CreditCardResponse {
        private Long id;
        private String name, bank, lastFourDigits, cardType;
        private BigDecimal creditLimit, outstanding;
        private Integer billingDate, paymentDueDate;
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
        public Integer getBillingDate() { return billingDate; }
        public void setBillingDate(Integer v) { billingDate = v; }
        public Integer getPaymentDueDate() { return paymentDueDate; }
        public void setPaymentDueDate(Integer v) { paymentDueDate = v; }
        public String getLastFourDigits() { return lastFourDigits; }
        public void setLastFourDigits(String v) { lastFourDigits = v; }
        public String getCardType() { return cardType; }
        public void setCardType(String v) { cardType = v; }
    }

    public static class BankAccountRequest {
        @NotBlank private String name;
        private String bankName;
        @NotBlank private String accountType;
        @NotNull private BigDecimal openingBalance;
        @JsonProperty("isDefault") private boolean isDefault;
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
    }

    public static class BankAccountResponse {
        private Long id;
        private String name, bankName, accountType;
        private BigDecimal openingBalance, currentBalance, totalInflow, totalOutflow;
        @JsonProperty("isDefault") private boolean isDefault;
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
}
