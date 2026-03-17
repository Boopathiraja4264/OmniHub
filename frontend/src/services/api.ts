import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
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
    api.post("/auth/login", { email, password }),
  register: (fullName: string, email: string, password: string) =>
    api.post("/auth/register", { fullName, email, password }),
};

export const transactionApi = {
  getAll: () => api.get("/transactions"),
  getRecent: () => api.get("/transactions/recent"),
  create: (data: any) => api.post("/transactions", data),
  update: (id: number, data: any) => api.put(`/transactions/${id}`, data),
  delete: (id: number) => api.delete(`/transactions/${id}`),
  getSummary: () => api.get("/transactions/summary"),
  getByCategory: (month: number, year: number) =>
    api.get("/transactions/analytics/by-category", { params: { month, year } }),
  getMonthly: (type: string, year: number) =>
    api.get("/transactions/analytics/monthly", { params: { type, year } }),
};

export const budgetApi = {
  getForMonth: (month: number, year: number) =>
    api.get("/budgets", { params: { month, year } }),
  create: (data: any) => api.post("/budgets", data),
  delete: (id: number) => api.delete(`/budgets/${id}`),
};

export const notificationApi = {
  getSettings: () => api.get("/notifications/email-settings"),
  updateSettings: (data: any) => api.put("/notifications/email-settings", data),
  sendTest: () => api.post("/notifications/email-settings/test"),
};

export const smsApi = {
  getSettings: () => api.get("/notifications/sms-settings"),
  updateSettings: (data: any) => api.put("/notifications/sms-settings", data),
  sendTest: () => api.post("/notifications/sms-settings/test"),
};

export const stepsApi = {
  getLogs: () => api.get("/fitness/steps"),
  getToday: () => api.get("/fitness/steps/today"),
  addLog: (data: any) => api.post("/fitness/steps", data),
  updateLog: (id: number, data: any) => api.put(`/fitness/steps/${id}`, data),
  deleteLog: (id: number) => api.delete(`/fitness/steps/${id}`),
  getTargets: () => api.get("/fitness/steps/targets"),
  addTarget: (data: any) => api.post("/fitness/steps/target", data),
  updateTarget: (id: number, data: any) => api.put(`/fitness/steps/target/${id}`, data),
  deleteTarget: (id: number) => api.delete(`/fitness/steps/target/${id}`),
};

export const slackApi = {
  getSettings: () => api.get("/notifications/slack-settings"),
  updateSettings: (data: any) => api.put("/notifications/slack-settings", data),
  sendTest: () => api.post("/notifications/slack-settings/test"),
};

export default api;
