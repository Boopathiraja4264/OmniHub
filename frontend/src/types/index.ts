export interface User {
  email: string;
  fullName: string;
  token: string;
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

// Static fallback used by quick-add forms; full dynamic list is managed via CategoryItemSettingsPage
export const EXPENSE_CATEGORIES = [
  'Commute', 'Eating Out(UnHealthy)', 'EMI', 'Entertainment', 'Fitness',
  'Grooming', 'Home & Living', 'Home Groceries(Healthy & Common)',
  'Home Groceries(Healthy & Personal)', 'Insurance', 'Investments',
  'Medical', 'Mobile & Internet', 'Shopping', 'Subscription', 'Other'
];
