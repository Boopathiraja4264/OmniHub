import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // send HttpOnly JWT cookie with every request
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isSessionCheck = err.config?.url?.endsWith('/auth/me');
      const publicPaths = ['/login', '/register', '/reset-password', '/oauth-callback'];
      const isPublic = publicPaths.some(p => window.location.pathname.startsWith(p));
      if (!isPublic && !isSessionCheck) window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (fullName: string, email: string, password: string) =>
    api.post("/auth/register", { fullName, email, password }),
  verifyEmail: (email: string, otp: string) =>
    api.post("/auth/verify-email", { email, otp }),
  resendVerification: (email: string) =>
    api.post("/auth/resend-verification", { email }),
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post("/auth/reset-password", { token, newPassword }),
  verify2FA: (tempToken: string, code: string, method: string, challengeToken?: string) =>
    api.post("/auth/2fa/verify", { tempToken, code, method, challengeToken }),
  getMe: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
  exchangeOauthCode: (code: string) => api.post("/auth/oauth/exchange", { code }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
  setPassword: (newPassword: string) =>
    api.post("/auth/set-password", { newPassword }),
  get2FAStatus: () => api.get("/auth/2fa/status"),
  setupTotp: () => api.post("/auth/2fa/setup/totp"),
  verifyTotpSetup: (code: string) => api.post("/auth/2fa/setup/verify", { code }),
  setupEmailOtp: () => api.post("/auth/2fa/setup/email-otp"),
  setupSmsOtp: () => api.post("/auth/2fa/setup/sms-otp"),
  setupPush: () => api.post("/auth/2fa/setup/push"),
  disable2FA: () => api.delete("/auth/2fa/disable"),
  pollPush: (challengeToken: string) => api.get(`/auth/2fa/push/poll/${challengeToken}`),
  approvePush: (challengeToken: string) => api.post(`/auth/2fa/push/approve/${challengeToken}`),
  denyPush: (challengeToken: string) => api.post(`/auth/2fa/push/deny/${challengeToken}`),
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
  getTopItems: (month: number, year: number) =>
    api.get("/transactions/analytics/top-items", { params: { month, year } }),
  getCardSpend: (month: number, year: number) =>
    api.get("/transactions/analytics/card-spend", { params: { month, year } }),
  getPivot: (year: number) =>
    api.get("/transactions/analytics/pivot", { params: { year } }),
  getByBankAccount: (accountId: number) =>
    api.get(`/transactions/by-bank-account/${accountId}`),
  getByCard: (cardId: number) =>
    api.get(`/transactions/by-card/${cardId}`),
};

export const creditCardApi = {
  getAll: () => api.get("/cards"),
  create: (data: any) => api.post("/cards", data),
  update: (id: number, data: any) => api.put(`/cards/${id}`, data),
  delete: (id: number) => api.delete(`/cards/${id}`),
};

export const bankAccountApi = {
  getAll: () => api.get("/bank-accounts"),
  create: (data: any) => api.post("/bank-accounts", data),
  update: (id: number, data: any) => api.put(`/bank-accounts/${id}`, data),
  delete: (id: number) => api.delete(`/bank-accounts/${id}`),
  setDefault: (id: number) => api.patch(`/bank-accounts/${id}/default`),
};

export const vehicleApi = {
  getAll: () => api.get("/vehicles"),
  create: (data: any) => api.post("/vehicles", data),
  delete: (id: number) => api.delete(`/vehicles/${id}`),
  getLogs: (vehicleId?: number) => api.get("/vehicles/logs", { params: vehicleId ? { vehicleId } : {} }),
  addLog: (data: any) => api.post("/vehicles/logs", data),
  deleteLog: (id: number) => api.delete(`/vehicles/logs/${id}`),
};

export const importExportApi = {
  exportAll: () =>
    api.get("/finance/export/all", { responseType: "blob" }),
  exportSummary: (year: number) =>
    api.get("/finance/export/summary", { params: { year }, responseType: "blob" }),
  exportTransactions: (month: number, year: number) =>
    api.get("/finance/export", { params: { month, year }, responseType: "blob" }),
  downloadTemplate: () =>
    api.get("/finance/template", { responseType: "blob" }),
  importTransactions: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/finance/import", form, { headers: { "Content-Type": "multipart/form-data" } });
  },
};

export const budgetApi = {
  getForMonth: (month: number, year: number) =>
    api.get("/budgets", { params: { month, year } }),
  create: (data: any) => api.post("/budgets", data),
  delete: (id: number) => api.delete(`/budgets/${id}`),
  updateLimit: (id: number, limitAmount: number) =>
    api.put(`/budgets/${id}`, { limitAmount }),
  getAnnual: (year: number) => api.get("/budgets/annual", { params: { year } }),
  setAnnual: (data: { category: string; monthlyBudget: number; year: number }) =>
    api.post("/budgets/annual", data),
};

export const categoryItemApi = {
  getAll: () => api.get("/finance/items"),
  getCategories: () => api.get("/finance/categories"),
  getItems: (categoryId: number) =>
    api.get("/finance/items", { params: { categoryId } }),
  addCategory: (name: string) => api.post("/finance/categories", { name }),
  deleteCategory: (id: number) => api.delete(`/finance/categories/${id}`),
  addItem: (name: string, categoryId: number) =>
    api.post("/finance/items", { name, categoryId }),
  deleteItem: (id: number) => api.delete(`/finance/items/${id}`),
  reset: () => api.post("/finance/categories/reset"),
  deduplicate: () => api.post("/finance/categories/deduplicate"),
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

export const productivityApi = {
  // Tasks
  getTasks: () => api.get('/productivity/tasks'),
  getActiveTasks: () => api.get('/productivity/tasks/active'),
  getTodayTasks: () => api.get('/productivity/tasks/today'),
  createTask: (data: any) => api.post('/productivity/tasks', data),
  updateTask: (id: number, data: any) => api.put(`/productivity/tasks/${id}`, data),
  updateTaskStatus: (id: number, status: string) => api.patch(`/productivity/tasks/${id}/status`, { status }),
  deleteTask: (id: number) => api.delete(`/productivity/tasks/${id}`),

  // Daily Plans
  getPlan: (date: string) => api.get('/productivity/plans', { params: { date } }),
  getPlansRange: (from: string, to: string) => api.get('/productivity/plans/range', { params: { from, to } }),
  createPlan: (data: any) => api.post('/productivity/plans', data),
  updatePlan: (id: number, data: any) => api.put(`/productivity/plans/${id}`, data),
  generatePlan: (id: number) => api.post(`/productivity/plans/${id}/generate`),
  deferIncomplete: (id: number) => api.post(`/productivity/plans/${id}/defer-incomplete`),

  // Time Blocks
  addBlock: (planId: number, data: any) => api.post(`/productivity/plans/${planId}/blocks`, data),
  updateBlock: (id: number, data: any) => api.put(`/productivity/time-blocks/${id}`, data),
  updateBlockStatus: (id: number, status: string) => api.patch(`/productivity/time-blocks/${id}/status`, { status }),
  deleteBlock: (id: number) => api.delete(`/productivity/time-blocks/${id}`),

  // Timer
  getActiveTimer: () => api.get('/productivity/timer/active'),
  startTimer: (data?: any) => api.post('/productivity/timer/start', data || {}),
  stopTimer: () => api.post('/productivity/timer/stop'),
  getTimeEntries: (date: string) => api.get('/productivity/timer/entries', { params: { date } }),
  deleteTimeEntry: (id: number) => api.delete(`/productivity/timer/entries/${id}`),

  // Weekly Templates
  getTemplates: () => api.get('/productivity/templates'),
  createTemplate: (data: any) => api.post('/productivity/templates', data),
  updateTemplate: (id: number, data: any) => api.put(`/productivity/templates/${id}`, data),
  deleteTemplate: (id: number) => api.delete(`/productivity/templates/${id}`),
  addTemplateBlock: (templateId: number, data: any) => api.post(`/productivity/templates/${templateId}/blocks`, data),
  updateTemplateBlock: (id: number, data: any) => api.put(`/productivity/templates/blocks/${id}`, data),
  deleteTemplateBlock: (id: number) => api.delete(`/productivity/templates/blocks/${id}`),

  // Reports
  getDashboard: () => api.get('/productivity/reports/dashboard'),
  getDailyReport: (date: string) => api.get('/productivity/reports/daily', { params: { date } }),
  getAdherence: (from: string, to: string) => api.get('/productivity/reports/adherence', { params: { from, to } }),
  getFocusScore: (date: string) => api.get('/productivity/reports/focus-score', { params: { date } }),
  computeFocusScore: (date: string) => api.post('/productivity/reports/focus-score/compute', null, { params: { date } }),
  getDailyScoreSeries: (from: string, to: string) => api.get('/productivity/reports/focus-score/series/daily', { params: { from, to } }),
  getWeeklyScoreSeries: (year: number) => api.get('/productivity/reports/focus-score/series/weekly', { params: { year } }),
  getMonthlyScoreSeries: (year: number) => api.get('/productivity/reports/focus-score/series/monthly', { params: { year } }),
};

export default api;
