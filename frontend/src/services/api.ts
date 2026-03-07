import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (fullName: string, email: string, password: string) =>
    api.post('/auth/register', { fullName, email, password }),
};

export const transactionApi = {
  getAll: () => api.get('/transactions'),
  create: (data: any) => api.post('/transactions', data),
  update: (id: number, data: any) => api.put(`/transactions/${id}`, data),
  delete: (id: number) => api.delete(`/transactions/${id}`),
  getSummary: () => api.get('/transactions/summary'),
  getByCategory: (month: number, year: number) =>
    api.get('/transactions/analytics/by-category', { params: { month, year } }),
  getMonthly: (type: string, year: number) =>
    api.get('/transactions/analytics/monthly', { params: { type, year } }),
};

export const budgetApi = {
  getForMonth: (month: number, year: number) =>
    api.get('/budgets', { params: { month, year } }),
  create: (data: any) => api.post('/budgets', data),
  delete: (id: number) => api.delete(`/budgets/${id}`),
};

export default api;
