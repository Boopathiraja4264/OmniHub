# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OmniHub is a personal tracking application (finance + fitness) with three platforms:
- **Backend:** Java 25 + Spring Boot 3.5 REST API
- **Frontend:** React 18 + TypeScript SPA
- **Android:** Kotlin + Jetpack Compose

## Commands

### Frontend (`frontend/`)
```bash
npm start          # Dev server at http://localhost:3000
npm run build      # Production build
npm test           # Run tests
npm test -- --testPathPattern=<filename>  # Run single test file
```

### Backend (`backend/`)
```bash
mvn spring-boot:run                    # Start dev server at http://localhost:8080
mvn test                               # Run all tests
mvn test -Dtest=ClassName              # Run single test class
mvn clean package -DskipTests          # Build JAR
```

### Android (`android/`)
```bash
./gradlew assembleDebug        # Build debug APK
./gradlew test                 # Run unit tests
./gradlew connectedAndroidTest # Run instrumented tests
```

### Docker (full stack)
```bash
docker-compose up -d    # Start all services (PostgreSQL + backend + frontend)
docker-compose down     # Stop all services
```

## Architecture

### Backend (`backend/src/main/java/com/omnihub/`)

Organized into vertical modules, each with `controller/`, `service/`, `entity/`, `repository/`:

- `core/` — Auth, JWT security, user management
- `finance/` — Transactions and budgets
- `fitness/` — Workouts, exercises, weight logs, weekly plans
- `notification/` — Email settings via Microsoft Graph API (Outlook)
- `backup/` — OneDrive integration via Microsoft Graph API

Key config: `backend/src/main/resources/application.properties` — reads DB credentials, JWT secret, and Microsoft API credentials from environment variables (loaded via dotenv from `.env` file at startup in `OmniHubApplication.java`).

Database schema is auto-managed by Hibernate (`ddl-auto=update`); no migration tool like Flyway is used.

### Frontend (`frontend/src/`)

- `modules/` — Feature pages: `auth/`, `finance/`, `fitness/`, `settings/`
- `components/` — Shared UI: `Sidebar.tsx`, `Dashboard.tsx`
- `services/api.ts` — Single Axios instance with JWT Bearer token interceptor; base URL `http://localhost:8080/api`
- `context/AuthContext.tsx` — Global auth state; token persisted in localStorage
- `types/index.ts` — All shared TypeScript types

Routing uses React Router v6 with a `ProtectedLayout` wrapper for authenticated pages. Theme (dark/light) is toggled in `App.tsx` and persisted to localStorage.

### Android (`android/app/src/main/java/com/omnihub/mobile/`)

Mirrors the web modules — `auth/`, `finance/`, `fitness/` — each following the same pattern: `data/XRepository.kt` + `ui/XViewModel.kt` + `ui/XScreen.kt`.

- `core/network/ApiService.kt` — Retrofit interface
- `core/network/RetrofitClient.kt` — HTTP client; debug build points to `http://10.0.2.2:8080/` (emulator localhost), release to `https://omnihub-prod.onrender.com/`

Navigation uses Compose Navigation with a bottom nav bar (Finance tab, Fitness tab).

## Environment Setup

The backend requires a `.env` file in `backend/` (see `SETUP_GUIDE.md`) with:
```
DB_USERNAME=...
DB_PASSWORD=...
JWT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_USER_ID=...
MICROSOFT_REFRESH_TOKEN=...
```

PostgreSQL must be running on port 5432 with database `omni_hub`.
