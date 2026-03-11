import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),
  register: (fullName: string, email: string, password: string) =>
    api.post("/api/auth/register", { fullName, email, password }),
};

export const transactionApi = {
  getAll: () => api.get("/api/transactions"),
  create: (data: any) => api.post("/api/transactions", data),
  update: (id: number, data: any) => api.put(`/api/transactions/${id}`, data),
  delete: (id: number) => api.delete(`/api/transactions/${id}`),
  getSummary: () => api.get("/api/transactions/summary"),
  getByCategory: (month: number, year: number) =>
    api.get("/api/transactions/analytics/by-category", { params: { month, year } }),
  getMonthly: (type: string, year: number) =>
    api.get("/api/transactions/analytics/monthly", { params: { type, year } }),
};

export const budgetApi = {
  getForMonth: (month: number, year: number) =>
    api.get("/api/budgets", { params: { month, year } }),
  create: (data: any) => api.post("/api/budgets", data),
  delete: (id: number) => api.delete(`/api/budgets/${id}`),
};

export default api;
