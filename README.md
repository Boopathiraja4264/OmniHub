# 🌐 OmniHub — All-in-One Personal Tracker

A modular, full-stack personal hub for tracking your life, starting with **Finance**, **Fitness**, and **Notifications**. Built with **Java Spring Boot** (backend) and **React TypeScript** (frontend).

## ✨ Features

### 💰 Finance Tracker
- **Authentication** — JWT-based register/login
- **Transaction Management** — Add, edit, delete income & expenses with categories
- **Budget Goals** — Set monthly spending limits with visual progress bars
- **Analytics Dashboard** — Doughnut, bar, and line charts powered by Chart.js

### 🏋️ Fitness Tracker
- **Workout Logging** — Track your daily workouts and sets
- **Exercise Database** — Manage your list of exercises
- **Weight Tracking** — Monitor your weight over time
- **Weekly Planning** — Plan your fitness routine for the week

### 📧 Notifications
- **Email Alerts** — Receive personalized summaries and budget alerts
- **Settings** — Manage your notification preferences directly from the dashboard

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
- Java 25
- Node.js 20+
- PostgreSQL 15+
- Maven 3.9+

### 1. Database Setup
```sql
CREATE DATABASE omni_hub;
```

### 2. Backend
```bash
cd backend
# Configure credentials in .env file (already in .gitignore)
# or export them directly:
export DB_USERNAME=postgres
export DB_PASSWORD=yourpassword
export JWT_SECRET=OmniHubSecretKeyThatIsVeryLongAndSecure

# Microsoft Graph API (OneDrive & Outlook)
export MICROSOFT_CLIENT_ID=your-client-id
export MICROSOFT_CLIENT_SECRET=your-client-secret
export MICROSOFT_REFRESH_TOKEN=your-refresh-token

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
| `MICROSOFT_CLIENT_ID` | Azure App Client ID | (required) |
| `MICROSOFT_CLIENT_SECRET` | Azure App Client Secret | (required) |
| `MICROSOFT_REFRESH_TOKEN` | Microsoft Graph Refresh Token | (required) |

## 📁 Project Structure (Modular)

```
omnihub/
├── backend/                    # Spring Boot API (package: com.omnihub)
│   └── src/main/java/com/omnihub/
│       ├── core/               # Shared: Auth, Security, Config, User
│       ├── backup/             # Feature: OneDrive Backups, Token Mgmt
│       ├── finance/            # Feature: Budgets, Transactions
│       ├── fitness/            # Feature: Workouts, Exercises, Weight
│       └── notification/       # Feature: Email Services (Graph API), Settings
└── frontend/                   # React TypeScript app
    └── src/
        ├── modules/            # Feature-based modules
        │   ├── auth/           # Login/Register
        │   ├── finance/        # Money tracking pages
        │   ├── fitness/        # Health tracking pages
        │   └── settings/       # Notification and account settings
        ├── components/         # Shared UI: Sidebar, Dashboard
        ├── context/            # Auth context
        ├── services/           # Axios API client
        └── types/              # TypeScript types
```

## 🚢 Deployment

Use Docker for a quick setup:
```bash
docker-compose up --build
```

## 📄 License

MIT
