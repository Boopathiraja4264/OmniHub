# 🚀 Complete Setup Guide (Beginner Friendly)

Follow these steps **in order** and you'll have the app running in about 15 minutes.

---

## STEP 1 — Download & Install VS Code

1. Go to **https://code.visualstudio.com**
2. Click the big **Download** button
3. Run the installer — keep clicking Next/OK with default options
4. Open VS Code when done

---

## STEP 2 — Install Java 25

1. Go to **https://jdk.java.net/25**
2. Download the version for your operating system (Windows / Mac / Linux)
3. Run the installer
4. To verify it worked, open a terminal and type:
   ```
   java -version
   ```
   You should see something like `java 25`

---

## STEP 3 — Install Maven (Java build tool)

1. Go to **https://maven.apache.org/download.cgi**
2. Download the **Binary zip archive** (e.g. `apache-maven-3.9.x-bin.zip`)
3. Extract it to a folder like `C:\Program Files\Maven` (Windows) or `/opt/maven` (Mac/Linux)
4. Add Maven to your PATH:
   - **Windows**: Search "Environment Variables" → Edit PATH → Add `C:\Program Files\Maven\bin`
   - **Mac/Linux**: Add `export PATH=/opt/maven/bin:$PATH` to your `~/.zshrc` or `~/.bashrc`
5. Verify:
   ```
   mvn -version
   ```

---

## STEP 4 — Install Node.js

1. Go to **https://nodejs.org**
2. Download the **LTS version** (the green button)
3. Run the installer with default options
4. Verify:
   ```
   node -version
   npm -version
   ```

---

## STEP 5 — Install PostgreSQL

1. Go to **https://www.postgresql.org/download/**
2. Choose your OS and download the installer
3. Run it — when it asks for a **password**, set it to `password` (or whatever you put in the `.env` file)
4. Keep the default port **5432**
5. After install, open **pgAdmin** (it installs alongside PostgreSQL)
6. In pgAdmin: right-click **Databases** → **Create** → **Database** → name it `omni_hub` → Save

---

## STEP 6 — Open the Project in VS Code

1. Open VS Code
2. Click **File → Open Folder**
3. Select the `omnihub` folder you downloaded
4. VS Code will ask **"Install recommended extensions?"** → Click **Install All** ✅
5. Wait a few minutes for everything to install

---

## STEP 7 — Install Frontend Dependencies

1. In VS Code, press **Ctrl+Shift+P** (Windows) or **Cmd+Shift+P** (Mac)
2. Type `Run Task` → press Enter
3. Select **📦 Install Frontend Dependencies**
4. Wait for it to finish (you'll see "found 0 vulnerabilities" when done)

---

## STEP 8 — Run the App!

### Start the Backend:
1. Press **Ctrl+Shift+P** → `Run Task` → select **🚀 Start Backend**
2. Wait until you see `Started OmniHubApplication` in the terminal

### Start the Frontend:
1. Press **Ctrl+Shift+P** → `Run Task` → select **🎨 Start Frontend**
2. Your browser will automatically open **http://localhost:3000**
3. Register an account and start tracking! 🎉

---

## STEP 9 — Push to GitHub

1. Go to **https://github.com** and create a free account if you don't have one
2. Click the **+** button → **New Repository**
3. Name it `omnihub`, leave it empty, click **Create Repository**
4. In VS Code, open the terminal (**Ctrl+`**) and run:

```bash
git init
git add .
git commit -m "Initial commit: OmniHub"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/omnihub.git
git branch -M main
git push -u origin main
```

5. Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username
6. Your code is now live on GitHub! 🎉

---

## 🆘 Common Problems & Fixes

| Problem | Fix |
|---------|-----|
| `java: command not found` | Java not installed or not in PATH — redo Step 2 |
| `mvn: command not found` | Maven not in PATH — redo Step 3 |
| `Cannot connect to database` | PostgreSQL not running, or wrong password in `.env` file |
| Port 8080 already in use | Another app is using it — restart your computer |
| `npm: command not found` | Node.js not installed — redo Step 4 |
| Extensions not installing | Check your internet connection and retry |

---

## 📁 Project Layout (What Each Folder Does)

```
omnihub/
├── 📁 backend/          ← Java Spring Boot API (the brain)
│   ├── src/             ← All Java source code
│   └── pom.xml          ← Java dependencies (like package.json)
│
├── 📁 frontend/         ← React website (what you see)
│   ├── src/             ← All React/TypeScript code
│   └── package.json     ← Frontend dependencies
│
├── 📁 .vscode/          ← VS Code config (makes your IDE smart)
├── 📁 .github/          ← GitHub Actions (auto-tests on push)
├── docker-compose.yml   ← Run everything with one command
└── README.md            ← Project documentation
```
