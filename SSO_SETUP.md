# OmniHub SSO Setup Guide

Once you have the credentials, add them to `backend/.env` and restart the backend.
For production, add the same vars in **Render → your backend service → Environment**.

---

## What to add to `backend/.env`

```env
# Google
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Microsoft (separate from the OneDrive one)
MICROSOFT_SSO_CLIENT_ID=your-microsoft-sso-client-id
MICROSOFT_SSO_CLIENT_SECRET=your-microsoft-sso-client-secret

# LinkedIn (optional)
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Make sure these match your deployed URLs
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
APP_BASE_URL=https://your-app.vercel.app
```

---

## 1. Google

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Under **Authorised redirect URIs**, add:
   - `http://localhost:8080/login/oauth2/code/google` (local)
   - `https://omnihub-prod.onrender.com/login/oauth2/code/google` (production)
7. Click **Create**
8. Copy **Client ID** → `GOOGLE_CLIENT_ID`
9. Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`

> If you see "OAuth consent screen not configured" — go to **APIs & Services → OAuth consent screen**, fill in app name, support email, and add your email as a test user.

---

## 2. GitHub

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **OAuth Apps → New OAuth App**
3. Fill in:
   - **Application name:** OmniHub
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:8080/login/oauth2/code/github`
4. Click **Register application**
5. Copy **Client ID** → `GITHUB_CLIENT_ID`
6. Click **Generate a new client secret**
7. Copy the secret → `GITHUB_CLIENT_SECRET`

> For production, create a **second OAuth App** with:
>
> - Homepage URL: `https://your-app.vercel.app`
> - Callback URL: `https://omnihub-prod.onrender.com/login/oauth2/code/github`

---

## 3. Microsoft

> This is a **separate app registration** from the OneDrive one (`MICROSOFT_CLIENT_ID`). Do not mix them up.

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search for **App registrations → New registration**
3. Fill in:
   - **Name:** OmniHub SSO
   - **Supported account types:** Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI:** Web → `http://localhost:8080/login/oauth2/code/microsoft-sso`
4. Click **Register**
5. Go to **Authentication → Add a platform → Web**, add production redirect URI:
   - `https://omnihub-prod.onrender.com/login/oauth2/code/microsoft-sso`
6. Copy **Application (client) ID** → `MICROSOFT_SSO_CLIENT_ID`
7. Go to **Certificates & secrets → New client secret**
8. Copy the **Value** (not the ID) → `MICROSOFT_SSO_CLIENT_SECRET`

---

## 4. LinkedIn (optional)

1. Go to [linkedin.com/developers](https://www.linkedin.com/developers)
2. Click **Create App**
3. Fill in app name, LinkedIn page, and logo
4. Go to **Auth** tab
5. Under **OAuth 2.0 settings → Authorized redirect URLs**, add:
   - `http://localhost:8080/login/oauth2/code/linkedin`
   - `https://omnihub-prod.onrender.com/login/oauth2/code/linkedin`
6. Copy **Client ID** → `LINKEDIN_CLIENT_ID`
7. Copy **Client Secret** → `LINKEDIN_CLIENT_SECRET`
8. Go to **Products** tab → request access to **Sign In with LinkedIn using OpenID Connect**

> LinkedIn requires product approval which can take a few minutes to a few hours.

---

## After adding credentials

1. Add the values to `backend/.env`
2. Restart the backend: `mvn spring-boot:run`
3. The SSO button for that provider will activate automatically — no code changes needed
4. For production: add the same vars in Render dashboard and redeploy
