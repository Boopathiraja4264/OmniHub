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
  date: string;
  notes?: string;
}

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

export const EXPENSE_CATEGORIES = [
  'Housing', 'Food', 'Transport', 'Healthcare', 'Entertainment',
  'Shopping', 'Utilities', 'Education', 'Travel', 'Other'
];

export const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Investment', 'Business', 'Gift', 'Other'
];
