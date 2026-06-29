export interface User {
  email: string;
  fullName: string;
  token: string;
  oauthProvider?: string;
  profilePicture?: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  itemName?: string;
  date: string;
  notes?: string;
  paymentSource?: string;
  cardId?: number;
  bankAccountId?: number;
  kmReading?: number;
  vehicleId?: number;
}

export interface CreditCard {
  id: number;
  name: string;
  bank?: string;
  creditLimit?: number;
  billingDate?: number;
  paymentDueDate?: number;
  lastFourDigits?: string;
  cardType?: string; // VISA | MASTERCARD | RUPAY | AMEX | DISCOVER | OTHER
  outstanding: number;
  balanceDate?: string;
  openingOutstanding?: number;
}

export interface BankAccount {
  id: number;
  name: string;
  bankName?: string;
  accountType: string; // SAVINGS | CURRENT | SALARY
  openingBalance: number;
  currentBalance: number;
  totalInflow: number;
  totalOutflow: number;
  isDefault: boolean;
  emergencyFund?: boolean;
  balanceDate?: string;
}

export interface Vehicle {
  id: number;
  name: string;
  type?: string;
  serviceIntervalKm: number;
}

export interface VehicleLog {
  id: number;
  vehicleId: number;
  vehicleName: string;
  date: string;
  kmAtService: number;
  nextServiceKm: number;
  serviceType?: string;
  cost?: number;
  notes?: string;
}

export const PAYMENT_SOURCES = ['CASH', 'BANK', 'CREDIT_CARD'] as const;
export type PaymentSource = typeof PAYMENT_SOURCES[number];

export interface Budget {
  id: number;
  category: string;
  limitAmount: number;
  spent: number;
  month: number;
  year: number;
}

export interface Summary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export interface ExpenseCategory {
  id: number;
  name: string;
}

export interface ExpenseItem {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  favorite?: boolean;
}

export interface MonthData {
  utilised: number;
  remaining: number;
  pct: number;
}

export interface AnnualCategoryRow {
  category: string;
  monthlyBudgets: Record<number, number>;
  budgetIds: Record<number, number>;
  months: Record<number, MonthData>;
  totalBudgeted: number;
  totalUtilised: number;
  ytdPct: number;
}

export interface AnnualBudgetResponse {
  year: number;
  categories: AnnualCategoryRow[];
  grandTotalBudgeted: number;
  grandTotalUtilised: number;
  overallPct: number;
}

export interface PivotItemRow {
  name: string;
  months: Record<number, number>;
  total: number;
}

export interface PivotCategoryRow {
  name: string;
  items: PivotItemRow[];
  monthlyTotals: Record<number, number>;
  total: number;
}

export interface PivotResponse {
  categories: PivotCategoryRow[];
  grandMonthlyTotals: Record<number, number>;
  grandTotal: number;
}

export const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Investment', 'Business', 'Gift', 'Other'
];

// ─── Productivity ─────────────────────────────────────────────────────────────

export type TaskCategory  = 'PERSONAL' | 'PROFESSIONAL';
export type TaskStatus    = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'DEFERRED';
export type TaskPriority  = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskRecurring = 'NONE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY';
export type BlockCategory = 'PERSONAL' | 'PROFESSIONAL' | 'DEEP_WORK' | 'BREAK' | 'ADMIN';
export type BlockStatus   = 'PLANNED' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED';
export type PlanStatus    = 'DRAFT' | 'ACTIVE' | 'COMPLETED';

export interface Task {
  id: number;
  title: string;
  description?: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  estimatedMinutes?: number;
  recurring: TaskRecurring;
  parentTaskId?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TimeBlock {
  id: number;
  planId: number;
  taskId?: number;
  title: string;
  category: BlockCategory;
  startTime: string;
  endTime: string;
  color?: string;
  status: BlockStatus;
  notes?: string;
  sortOrder: number;
  plannedMinutes?: number;
}

export interface DailyPlan {
  id: number;
  planDate: string;
  notes?: string;
  status: PlanStatus;
  timeBlocks: TimeBlock[];
  createdAt: string;
}

export interface TimeEntry {
  id: number;
  taskId?: number;
  blockId?: number;
  description?: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes?: number;
  running: boolean;
}

export interface WeeklyTemplate {
  id: number;
  name: string;
  active: boolean;
  blocks: TemplateBlock[];
  createdAt: string;
}

export interface TemplateBlock {
  id: number;
  templateId: number;
  dayOfWeek: string;
  title: string;
  category: BlockCategory;
  startTime: string;
  endTime: string;
  color?: string;
  sortOrder: number;
}

export interface FocusScoreResponse {
  date: string;
  totalScore: number;
  taskScore: number;
  blockScore: number;
  timeAccuracyScore: number;
  streakBonus: number;
  streakDays: number;
  label: string;
  tasksPlanned: number;
  tasksDone: number;
  blocksPlanned: number;
  blocksDone: number;
  adherenceRate: number;
}

export interface ScoreSeriesPoint {
  date: string;
  score: number;
  label: string;
}

export interface AdherenceDataPoint {
  date: string;
  plannedMinutes: number;
  loggedMinutes: number;
  adherenceRate: number;
  byCategory: Record<string, { plannedMinutes: number; loggedMinutes: number }>;
}

export interface ProductivityDashboard {
  todayScore?: FocusScoreResponse;
  weekAvgScore: number;
  monthAvgScore: number;
  currentStreak: number;
  todayAdherence: number;
  pendingTasks: number;
  todayBlocksDone: number;
  todayBlocksTotal: number;
  timerRunning: boolean;
  activeTimer?: TimeEntry;
}

// ─── Investments (RD / FD) ────────────────────────────────────────────────────

export interface RdMonthlyPayment {
  id: number;
  monthNumber: number;
  paymentDate?: string;
  amountPaid?: number;
  notes?: string;
}

export interface RdFdInvestment {
  id: number;
  type: 'RD' | 'FD';
  name: string;
  bankName?: string;
  amount: number;
  annualInterestRate: number;
  tenureMonths: number;
  startDate: string;
  maturityDate: string;
  emergencyFund: boolean;
  status: 'ACTIVE' | 'MATURED' | 'CLOSED';
  notes?: string;
  totalInvested: number;
  maturityAmount: number;
  interestEarned: number;
  currentValue: number;
  efPrincipal: number;
  monthsPaid: number;
  payments: RdMonthlyPayment[];
}

export interface InvestmentDashboard {
  totalInvested: number;
  totalMaturityValue: number;
  totalInterestEarned: number;
  emergencyFundTotal: number;
  activeCount: number;
  fdList: RdFdInvestment[];
  rdList: RdFdInvestment[];
}

export interface RdFdRequest {
  type: 'RD' | 'FD';
  name: string;
  bankName?: string;
  amount: number;
  annualInterestRate: number;
  tenureMonths: number;
  startDate: string;
  emergencyFund: boolean;
  status?: string;
  notes?: string;
}

// ─── Chit Tracker Types ───────────────────────────────────────────────────────

export interface ChitMonthlyEntry {
  id: number;
  monthNumber: number;
  monthDate: string;
  amountPerMonth: number;
  kasirPerMonth?: number;
  companyYelam?: number;
  thalliEduthathu?: number;
  paid?: boolean;
  paidDate?: string;
  paidBankAccountId?: number;
  paidTransactionId?: number;
}

export interface ChitBatch {
  id: number;
  batchNumber: number;
  dateTaken?: string;
  amountTaken?: number;
  monthlyEntries: ChitMonthlyEntry[];
}

export interface ChitGroup {
  id: number;
  name: string;
  groupLabel: string;
  membersCount: number;
  totalBatches: number;
  membersPerBatch: number;
  monthlyAmount: number;
  basicInterest?: number;
  companyCommission?: number;
  startDate: string;
  status: 'ACTIVE' | 'COMPLETED';
  notes?: string;
  totalAmount: number;
  totalPaid: number;
  totalReceived: number;
  totalKasir: number;
  batches: ChitBatch[];
}

export interface ChitGroupRequest {
  name: string;
  groupLabel: string;
  membersCount: number;
  totalBatches: number;
  membersPerBatch: number;
  monthlyAmount: number;
  basicInterest?: number;
  companyCommission?: number;
  startDate: string;
  status?: string;
  notes?: string;
}

// ─── Debt Tracker ─────────────────────────────────────────────────────────────

export interface EmiInstallment {
  id: number;
  installmentNumber: number;
  dueDate: string;
  openingPrincipal: number;
  emiAmount: number;
  principalPart: number;
  interestPart: number;
  gstPart: number;
  closingPrincipal: number;
  processingCharge?: number;
  paid: boolean;
}

export interface EmiLoanSummary {
  id: number;
  loanId: string;
  name: string;
  status: 'ACTIVE' | 'CLOSED' | 'FORECLOSED';
  initialPrincipal: number;
  annualInterestRate: number;
  tenureMonths: number;
  gstRate?: number;
  baseEmi: number;
  principalPaid?: number;
  interestPaid?: number;
  gstPaid?: number;
  outstandingPrincipal: number;
  futureInterest: number;
  startDate: string;
  endDate?: string;
  foreclosed: boolean;
  foreclosureDate?: string;
  foreclosureAmount?: number;
  foreclosurePrincipal?: number;
  foreclosureInterest?: number;
  foreclosureCharges?: number;
  foreclosureChargesGst?: number;
  foreclosureInterestGst?: number;
  processingCharge?: number;
  processingChargePaid?: number;
  notes?: string;
}

export interface EmiLoanDetail {
  summary: EmiLoanSummary;
  installments: EmiInstallment[];
}

export interface PrepaymentEntry {
  id: number;
  paymentDate: string;
  amount: number;
  interestAccrued?: number;
}

export interface AnnualLoanSummary {
  id: number;
  loanId: string;
  name: string;
  status: 'OUTSTANDING' | 'REPAID';
  initialPrincipal: number;
  annualInterestRate: number;
  currentBalance?: number;
  totalInterestAccrued?: number;
  interestPaid?: number;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface AnnualLoanDetail {
  summary: AnnualLoanSummary;
  prepayments: PrepaymentEntry[];
}

export interface BorrowedRepayment {
  id: number;
  paymentDate: string;
  amount: number;
  note?: string;
}

export interface BorrowedLoanSummary {
  id: number;
  loanId: string;
  lenderName: string;
  status: 'OUTSTANDING' | 'REPAID';
  amountBorrowed: number;
  amountRepaid: number;
  outstandingBalance: number;
  dateBorrowed: string;
  notes?: string;
}

export interface BorrowedLoanDetail {
  summary: BorrowedLoanSummary;
  repayments: BorrowedRepayment[];
}

export interface DebtDashboard {
  totalInitialPrincipal: number;
  totalOutstanding: number;
  monthlyEmiOutflow: number;
  debtFreeProgress: number;
  emiLoans: EmiLoanSummary[];
  annualLoans: AnnualLoanSummary[];
  borrowedLoans: BorrowedLoanSummary[];
}

// ─── Static Categories ────────────────────────────────────────────────────────

// Static fallback used by quick-add forms; full dynamic list is managed via CategoryItemSettingsPage
export const EXPENSE_CATEGORIES = [
  'Commute', 'Eating Out(UnHealthy)', 'EMI', 'Entertainment', 'Fitness',
  'Grooming', 'Home & Living', 'Home Groceries(Healthy & Common)',
  'Home Groceries(Healthy & Personal)', 'Insurance', 'Investments',
  'Medical', 'Mobile & Internet', 'Shopping', 'Subscription', 'Other'
];
