# OmniHub — All-in-One Personal Tracker

A modular, full-stack personal hub for tracking your life — **Finance**, **Fitness**, and **Notifications**. Built with **Java Spring Boot** (backend) and **React TypeScript** (frontend), with an **Android** (Kotlin + Jetpack Compose) companion app.

---

## Features

### Finance Tracker
- **Authentication** — JWT-based register/login
- **Transaction Management** — Add, edit, delete income & expenses with categories and items; separate forms for Expense / Income; Type auto-set from the button clicked
- **Account-to-Account Transfer** — One click creates a matched debit + credit pair across bank accounts
- **Bank Accounts** — Add savings/current/salary accounts with opening balance; set a default account (auto-selected on new transactions); click any account to open a detail page with full transaction history and running balance per row
- **Credit Cards** — Track outstanding balance, credit limit, utilisation %; click any card to open a detail page with cumulative spend per row; record bill payments directly from the card
- **Budget & Spend** — Set monthly spending limits per category with visual progress bars; Annual pivot table with per-month expand/collapse (current month open by default, others collapsed) — all theme-aware
- **Analytics Dashboard** — Doughnut, bar, and line charts (Chart.js) for category spend, income vs expenses, net savings, and top items; annual summary charts
- **Import / Export** — Download monthly or all-time Excel exports; annual pivot summary report with charts; bulk import from Excel template
- **Category & Item Settings** — Manage expense categories and sub-items
- **Vehicle Log** — Track service history, KM readings, and next service due for multiple vehicles

### Fitness Tracker
- **Workout Logging** — Log daily workouts with sets, reps, and weight per exercise
- **Exercise Database** — Manage your own exercise list with muscle group tags
- **Weight Tracking** — Log daily weight; visualise trends with Recharts line graph; per-month log view
- **Weekly Planning** — Plan your training schedule day by day; search exercises by name or muscle group; today's plan auto-expands
- **Steps & Run Tracking** — Log daily steps and running distance

### Notifications
- **Email** — Daily personalised summaries via Microsoft Graph API (Outlook); configurable send time and content toggles
- **SMS** — Fast2SMS integration with dual send times and content toggles
- **Slack** — Webhook-based notifications with three templates (Morning / Finance / Full); dual send times
- **OneDrive Backup** — Scheduled database backups to OneDrive via Microsoft Graph API

### UI / UX
- **Modern custom dropdown** — All selects across the app replaced with a floating-panel `FilterDropdown` component: click-outside close, checkmark on active option, disabled state, full-width mode
- **Dark / Light theme** — CSS variable-based theming throughout; all components theme-aware
- **Tamil cultural content** — Daily Thirukkural and Bharathiyar poem cards on the home page with refresh
- **Internationalisation** — English and Tamil (i18next)
- **Sentry error monitoring** — Automatic error capture in production
- **Vercel Analytics + Speed Insights** — Page-level performance tracking

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 25, Spring Boot 3.5, Spring Security, JPA/Hibernate |
| Database | PostgreSQL |
| Auth | JWT (jjwt) |
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
├── backend/                        # Spring Boot REST API
│   └── src/main/java/com/omnihub/
│       ├── core/                   # Auth, JWT, Security, User
│       ├── backup/                 # OneDrive backup scheduling
│       ├── finance/                # Transactions, Budgets, Bank accounts,
│       │                           # Credit cards, Categories, Vehicles, Import/Export
│       ├── fitness/                # Workouts, Exercises, Weight, Weekly plan, Steps
│       └── notification/           # Email, SMS, Slack settings & scheduling
│
├── frontend/                       # React TypeScript SPA
│   └── src/
│       ├── modules/
│       │   ├── auth/               # Login / Register
│       │   ├── finance/            # Transactions, Accounts, Budgets, Analytics,
│       │   │                       # Import/Export, Vehicles, Categories
│       │   ├── fitness/            # Dashboard, Workouts, Weight, Weekly plan, Steps
│       │   ├── home/               # Home page (Thirukkural, Bharathiyar, quick log)
│       │   └── settings/           # Email, SMS, Slack, Backup settings
│       ├── components/             # TopNav, Dashboard, FilterDropdown, ...
│       ├── context/                # Auth, Theme
│       ├── services/               # Axios API client (api.ts)
│       └── types/                  # Shared TypeScript types
│
└── android/                        # Kotlin + Jetpack Compose app
    └── src/main/java/com/omnihub/mobile/
        ├── auth/                   # Login screen
        ├── finance/                # Finance screens
        └── fitness/                # Fitness screens
```

---

## API Overview

All endpoints are under `/api` and require `Authorization: Bearer <token>` except `/api/auth/**` and `/actuator/health`.

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login` |
| Transactions | `GET/POST /transactions`, `PUT/DELETE /transactions/{id}`, `GET /transactions/by-bank-account/{id}`, `GET /transactions/by-card/{id}` |
| Bank Accounts | `GET/POST /bank-accounts`, `DELETE /bank-accounts/{id}`, `PATCH /bank-accounts/{id}/default` |
| Credit Cards | `GET/POST /credit-cards`, `DELETE /credit-cards/{id}` |
| Budgets | `GET/POST /budgets`, `DELETE /budgets/{id}` |
| Analytics | `GET /transactions/by-category`, `GET /transactions/monthly`, `GET /transactions/pivot`, `GET /transactions/top-items` |
| Vehicles | `GET/POST /vehicles`, `GET/POST /vehicles/logs` |
| Import/Export | `GET /import-export/export`, `POST /import-export/import` |
| Fitness | `/fitness/workouts`, `/fitness/exercises`, `/fitness/weight`, `/fitness/weekly-plan`, `/fitness/steps` |
| Settings | `/settings/email`, `/settings/sms`, `/settings/slack` |
| Backup | `/backup/trigger`, `/backup/history` |

---

## Recent Changes (2026-03-18 – 2026-03-19)

### Backend
- **Set Default bank account** — Fixed Jackson `@JsonProperty("isDefault")` serialization bug (Java `isXxx()` getter was stripping the `is` prefix); rewrote `setDefault` service to avoid Hibernate lazy-loading proxy issue by using `findByUserIdAndIsDefaultTrue` + `findByIdAndUserId` instead of bulk JPQL
- **New transaction endpoints** — `GET /transactions/by-bank-account/{id}` and `GET /transactions/by-card/{id}` returning transactions sorted oldest→newest for running balance calculation
- **CORS** — Added `PATCH` to allowed methods for the default bank account endpoint

### Frontend
- **Bank Account detail page** — Click any bank account card to open a full transaction history with a "Balance After" column (opening balance ± each transaction), grouped by month newest-first, with year/month filter dropdowns and prev/current/next month quick filters
- **Credit Card detail page** — Click any credit card card to open a full transaction history with a "Cumulative Spend" column, same filter UI
- **Set Default inline** — Default badge appears inline next to the account type badge; "Set Default" button is a small ghost pill that disappears once set
- **Transfer feature** — New "⇄ Transfer" button in Transactions creates a matched EXPENSE from the source account and INCOME to the destination account
- **Transaction form redesign** — Type is set by the button (+ Expense / + Income); form fields are side-by-side in a 2-column grid (Amount | Date, Category | Item, Payment Source | Account)
- **Duplicate category fix** — Deduplicated expense categories on load
- **Budget & Spend rename** — "Budget Tracker" → "Budget & Spend" in nav and page title
- **Annual pivot table** — Per-month collapse/expand: current month starts expanded, all others collapsed to a thin strip; click any month header to toggle; table width adjusts dynamically; theme fixed (replaced hardcoded Excel blue with CSS variables)
- **FilterDropdown component** — New custom dropdown with floating panel, click-outside close, checkmark on active option, chevron animation, disabled/fullWidth support; replaced every native `<select>` across the entire app:
  - Analytics (month, year)
  - Import/Export (summary year, month, year)
  - Budget & Spend (year header, category in modal)
  - Transactions (category, item, income category, deposit account, payment source, bank account, credit card, transfer from/to)
  - Accounts (account type, card type, pay from bank account)
  - Vehicle Log (filter, vehicle type, vehicle in log modal)
  - Weekly Plan (muscle group filter)
  - Settings (Slack template 1 & 2)
  - Home (exercise select, category select)
  - Weight page (month selector)
  - Exercises (muscle group in add modal)

---

## License

MIT
