# OmniHub — All-in-One Personal Tracker

A modular, full-stack personal hub for tracking your life — **Finance**, **Fitness**, **Productivity**, and **Notifications**. Built with **Java Spring Boot** (backend) and **React TypeScript** (frontend), with an **Android** (Kotlin + Jetpack Compose) companion app.

---

## Features

### Finance Tracker

**Income & Expense**
- Transaction management — add, edit, delete income & expenses with categories and sub-items; auto-set type from button clicked
- Account-to-account transfer — one click creates a matched debit + credit pair across bank accounts
- Bank accounts — savings/current/salary accounts with opening balance, default account, full transaction history with running balance per row
- Credit cards — outstanding balance, credit limit, utilisation %; bill payment recording; per-card transaction history with cumulative spend
- Budget & Spend — monthly limits per category with visual progress bars; annual pivot table with per-month expand/collapse
- Analytics — doughnut, bar, and line charts (Chart.js) for category spend, income vs expenses, net savings, and top items; annual summary charts
- Import / Export — monthly or all-time Excel exports; annual pivot report; bulk import from Excel template
- Category & Item settings — manage expense categories and sub-items
- Vehicle log — service history, KM readings, and next service due for multiple vehicles

**Debt Tracker**
- EMI loans — track monthly instalments with paid/unpaid toggle, foreclosure support, processing charges, interest calculation
- Annual interest loans — interest accrual tracking with prepayment history and running balance
- Borrowed money — repayment log with running balance per repayment

**Investments**
- RD / FD tracker — recurring and fixed deposits with maturity value, interest rate, tenure; payment history
- Chit tracker — chit group management with monthly entries, kasir tracking, and batch detail pages
- Emergency fund — flag bank accounts as emergency fund; track total emergency corpus
- Investment dashboard — consolidated view of total invested, interest earned, and active count

### Fitness Tracker
- Workout logging — sets, reps, and weight per exercise; per-day workout history
- Exercise database — custom exercise list with muscle group tags
- Weight tracking — daily weight log; trend line chart; per-month view
- Weekly planning — day-by-day training schedule; search by name or muscle group; today auto-expands
- Steps & run tracking — daily steps and running distance log

### Productivity (Focus)
- Task board — create, update, and track tasks with priority, category, due date, and status
- Daily plan — structured day planning with time blocks; defer incomplete items
- Calendar — month view of planned days and tasks
- Weekly templates — reusable day templates to auto-generate daily plans
- Timer — start/stop focus timer tied to time blocks and tasks
- Insights — focus score, adherence charts, daily and weekly score series

### Profile & Security
- Profile picture — upload and store a photo (base64, shown everywhere in the app)
- Name update — edit display name inline from the profile panel
- Password management — change password, set password for OAuth accounts, forgot-password reset link
- Two-factor authentication — TOTP, email OTP, SMS OTP, push notification 2FA methods

### Notifications
- Email — daily personalised summaries via Microsoft Graph API (Outlook); configurable send time and content toggles
- SMS — Fast2SMS integration with dual send times and content toggles
- Slack — webhook-based notifications with three templates (Morning / Finance / Full); dual send times
- OneDrive backup — scheduled database backups to OneDrive via Microsoft Graph API

### UI / UX
- **Custom DatePicker** — modern calendar component with month/year quick-navigation; replaces all native `<input type="date">` fields
- **Custom FilterDropdown** — floating-panel select with click-outside close, checkmark, disabled state, full-width mode; replaces all native `<select>` elements
- **Dark / Light theme** — CSS variable-based theming throughout; all components theme-aware
- **Home screen overview** — finance summary, investment totals, budget progress, fitness stats, and active task count on one screen; Thirukkural (with explanation) and Bharathiyar poem cards
- **Profile hover dropdown** — hover avatar to see name, email, login method; click to open full profile panel
- **Internationalisation** — English and Tamil (i18next)
- **Sentry error monitoring** — automatic error capture in production
- **Vercel Analytics + Speed Insights** — page-level performance tracking

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 25, Spring Boot 3.5, Spring Security, JPA/Hibernate |
| Database | PostgreSQL |
| Auth | JWT (jjwt), OAuth2 (Google), 2FA (TOTP / OTP / Push) |
| Frontend | React 18, TypeScript, Chart.js, Recharts |
| Android | Kotlin, Jetpack Compose, Retrofit |
| Notifications | Microsoft Graph API, Fast2SMS, Slack Webhooks |
| Deployment | Render (backend), Vercel (frontend), Neon (PostgreSQL) |
| Build | Maven, npm |

---

## Quick Start

### Prerequisites
- Java 25
- Node.js 20+
- PostgreSQL 15+
- Maven 3.9+

### 1. Database
```sql
CREATE DATABASE omni_hub;
```

### 2. Backend
```bash
cd backend
# Create a .env file (see Environment Variables below)
mvn spring-boot:run
```
Runs on **http://localhost:8080**

### 3. Frontend
```bash
cd frontend
npm install
npm start
```
Runs on **http://localhost:3000**

### 4. Docker (full stack)
```bash
docker-compose up -d
```

---

## Environment Variables

Create `backend/.env`:

| Variable | Description |
|----------|-------------|
| `DB_USERNAME` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | JWT signing secret (use a long random string) |
| `MICROSOFT_CLIENT_ID` | Azure App Client ID (OneDrive / Outlook) |
| `MICROSOFT_CLIENT_SECRET` | Azure App Client Secret |
| `MICROSOFT_USER_ID` | Microsoft user ID for Graph API |
| `MICROSOFT_REFRESH_TOKEN` | Microsoft Graph refresh token |

---

## Project Structure

```
omnihub/
├── backend/
│   └── src/main/java/com/omnihub/
│       ├── core/                    # Auth, JWT, OAuth2, 2FA, user profile, security
│       ├── finance/                 # Transactions, budgets, bank accounts, credit cards,
│       │                            # categories, vehicles, import/export,
│       │                            # EMI/annual/borrowed debt, RD/FD investments,
│       │                            # chit tracker, emergency fund
│       ├── fitness/                 # Workouts, exercises, weight, weekly plan, steps
│       ├── productivity/            # Tasks, daily plans, time blocks, timer,
│       │                            # weekly templates, focus score, insights
│       ├── notification/            # Email, SMS, Slack settings & scheduling
│       └── backup/                  # OneDrive backup scheduling
│
├── frontend/
│   └── src/
│       ├── modules/
│       │   ├── auth/                # Login, register, OAuth callback, password reset
│       │   ├── finance/
│       │   │   ├── FinanceOverviewPage
│       │   │   ├── IncomeExpenseDashboard / TransactionsPage / AnalyticsPage
│       │   │   ├── AccountsPage / BankAccountDetailPage / CreditCardDetailPage
│       │   │   ├── BudgetsPage / AnnualBudgetPage
│       │   │   ├── ImportExportPage / CategoryItemSettingsPage / VehicleLogPage
│       │   │   ├── DebtTrackerPage
│       │   │   │   ├── EmiLoansPage / EmiLoanDetailPage
│       │   │   │   ├── AnnualLoansPage / AnnualLoanDetailPage
│       │   │   │   └── BorrowedLoansPage / BorrowedLoanDetailPage
│       │   │   └── InvestmentsDashboard / InvestmentsPage
│       │   │       ChitTrackerPage / ChitGroupDetailPage / EmergencyFundPage
│       │   ├── fitness/             # Dashboard, workout, exercises, weight, weekly plan, steps
│       │   ├── productivity/        # Dashboard, tasks, calendar, today, templates, insights
│       │   ├── home/                # Home overview + Thirukkural + Bharathiyar
│       │   └── settings/            # Notifications (email/SMS/Slack), backup, 2FA
│       ├── components/
│       │   ├── TopNav.tsx           # Navigation + profile hover dropdown + profile panel
│       │   ├── DatePicker.tsx       # Custom calendar picker with month/year navigation
│       │   ├── FilterDropdown.tsx   # Custom floating-panel select
│       │   ├── Dashboard.tsx
│       │   └── AddTransactionModal.tsx
│       ├── context/                 # AuthContext (user, login, logout, updateUser)
│       ├── services/
│       │   ├── api.ts               # Axios instance + all API methods
│       │   └── external/            # ThirukkuralApi, BharathiyarApi
│       └── types/                   # All shared TypeScript interfaces
│
└── android/
    └── src/main/java/com/omnihub/mobile/
        ├── auth/                    # Login screen
        ├── finance/                 # Finance screens
        └── fitness/                 # Fitness screens
```

---

## API Overview

All endpoints are under `/api` and require `Authorization: Bearer <token>` (or HttpOnly cookie) except `/api/auth/**` and `/actuator/health`.

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PATCH /auth/profile` |
| Password | `POST /auth/change-password`, `POST /auth/set-password`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| 2FA | `POST /auth/2fa/verify`, `POST /auth/2fa/setup/*` |
| Transactions | `GET/POST /transactions`, `PUT/DELETE /transactions/{id}` |
| Bank Accounts | `GET/POST /bank-accounts`, `DELETE /bank-accounts/{id}`, `PATCH /bank-accounts/{id}/default` |
| Credit Cards | `GET/POST /credit-cards`, `DELETE /credit-cards/{id}` |
| Budgets | `GET/POST /budgets`, `DELETE /budgets/{id}`, `GET/POST /budgets/annual` |
| Analytics | `GET /transactions/by-category`, `GET /transactions/monthly`, `GET /transactions/pivot` |
| Debt | `GET/POST /debt/emi`, `GET/POST /debt/annual`, `GET/POST /debt/borrowed` |
| Investments | `GET /investments/dashboard`, `GET/POST /investments`, `POST /investments/{id}/payments` |
| Chit | `GET/POST /chit/groups`, `PUT /chit/batches/{id}`, `PUT /chit/entries/{id}/kasir` |
| Vehicles | `GET/POST /vehicles`, `GET/POST /vehicles/logs` |
| Import/Export | `GET /import-export/export`, `POST /import-export/import` |
| Fitness | `/fitness/workouts`, `/fitness/exercises`, `/fitness/weight`, `/fitness/weekly-plan`, `/fitness/steps` |
| Productivity | `/productivity/tasks`, `/productivity/plans`, `/productivity/time-blocks`, `/productivity/timer`, `/productivity/templates`, `/productivity/reports/*` |
| Settings | `/notifications/email-settings`, `/notifications/sms-settings`, `/notifications/slack-settings` |
| Backup | `/backup/trigger`, `/backup/history` |

---

## License

MIT
