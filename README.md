# 💰 Ledger — Finance Tracker

A full-stack personal finance tracker built with **Java Spring Boot** (backend) and **React TypeScript** (frontend).

## ✨ Features

- **Authentication** — JWT-based register/login
- **Transaction Management** — Add, edit, delete income & expenses with categories
- **Budget Goals** — Set monthly spending limits with visual progress bars
- **Analytics Dashboard** — Doughnut, bar, and line charts powered by Chart.js
- **Responsive UI** — Luxe dark theme with gold accents

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 25, Spring Boot 3.5, Spring Security, JPA |
| Database | PostgreSQL |
| Auth | JWT (jjwt) |
| Frontend | React 18, TypeScript, Chart.js |
| Build | Maven, npm |

## 🚀 Quick Start

### Prerequisites
- Java 17+
- Node.js 18+
- PostgreSQL 14+
- Maven 3.8+

### 1. Database Setup
```sql
CREATE DATABASE finance_tracker;
```

### 2. Backend
```bash
cd backend
# Configure DB credentials (or use env vars)
export DB_USERNAME=postgres
export DB_PASSWORD=yourpassword
export JWT_SECRET=yourverylongsecretkey

mvn spring-boot:run
```
Backend runs on **http://localhost:8080**

### 3. Frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs on **http://localhost:3000**

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_USERNAME` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `password` |
| `JWT_SECRET` | JWT signing secret | (set a strong value!) |

## 📁 Project Structure

```
finance-tracker/
├── backend/                    # Spring Boot API
│   └── src/main/java/com/financetracker/
│       ├── controller/         # REST endpoints
│       ├── service/            # Business logic
│       ├── entity/             # JPA entities
│       ├── repository/         # Data access
│       ├── security/           # JWT auth
│       ├── dto/                # Request/response objects
│       └── config/             # Security config
└── frontend/                   # React TypeScript app
    └── src/
        ├── pages/              # Dashboard, Transactions, Budgets, Analytics
        ├── components/         # Sidebar
        ├── context/            # Auth context
        ├── services/           # Axios API client
        └── types/              # TypeScript types
```

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |

### Transactions (🔒 Authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | Get all transactions |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/{id}` | Update transaction |
| DELETE | `/api/transactions/{id}` | Delete transaction |
| GET | `/api/transactions/summary` | Financial summary |
| GET | `/api/transactions/analytics/by-category` | Expenses by category |
| GET | `/api/transactions/analytics/monthly` | Monthly totals |

### Budgets (🔒 Authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/budgets?month=1&year=2025` | Get monthly budgets |
| POST | `/api/budgets` | Create budget |
| DELETE | `/api/budgets/{id}` | Delete budget |

## 🚢 Deployment

See [`.github/workflows/`](.github/workflows/) for CI/CD pipeline examples.

For production, set environment variables securely and use a managed PostgreSQL service (e.g. Railway, Supabase, AWS RDS).

## 📄 License

MIT
