/**
 * Internal backend API calls for the Home module.
 * External API calls (e.g. Thirukkural) live in src/services/external/
 */

import api, { transactionApi } from '../../services/api';

export const fetchFitnessDashboard = () =>
  api.get('/fitness/dashboard');

export const fetchExercises = () =>
  api.get('/fitness/exercises');

export const logWeight = (weight: number, date: string, notes: string) =>
  api.post('/fitness/weight', { weight, date, notes });

export const logWorkout = (
  date: string,
  sets: { exerciseId: number; sets: number; reps: number; weight: number }[]
) => api.post('/fitness/workouts', { date, notes: '', sets });

export const addTransaction = (payload: {
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
  notes: string;
}) => transactionApi.create(payload);
