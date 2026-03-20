import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { smsApi, slackApi } from "../../services/api";
import FilterDropdown from "../../components/FilterDropdown";
import BackupPage from "./BackupPage";
import AuthenticationPage from "./AuthenticationPage";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next";

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({
  value,
  onChange,
}) => (
  <div
    onClick={onChange}
    style={{
      width: 52,
      height: 28,
      borderRadius: 14,
      cursor: "pointer",
      backgroundColor: value ? "var(--primary)" : "var(--bg-elevated)",
      border: "1px solid var(--border)",
      position: "relative",
      transition: "background-color 0.2s",
      flexShrink: 0,
    }}
  >
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        backgroundColor: "white",
        position: "absolute",
        top: 3,
        left: value ? 27 : 3,
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
    />
  </div>
);

type Tab = "appearance" | "authentication" | "email" | "sms" | "slack" | "backup";

const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [activeTab, setActiveTab] = useState<Tab>("appearance");
  const [settings, setSettings] = useState({
    enabled: false,
    sendTime: "08:00",
    includeFinance: true,
    includeFitness: true,
    includeBudgetAlerts: true,
    includeWeeklyPlan: true,
  });
  const [customEmail, setCustomEmail] = useState("");
  const [backupTime, setBackupTime] = useState("00:00");
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEmailContent, setShowEmailContent] = useState(false);
  const [showBackupInfo, setShowBackupInfo] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // SMS settings state
  const [smsSettings, setSmsSettings] = useState({
    enabled: false,
    phoneNumber: "",
    sendTime1: "08:00",
    sendTime2: "",
    includeWeight: true,
    includeWorkout: true,
    includeTransactions: true,
    includeBudget: true,
    includeWeeklyPlan: true,
  });
  const [showSecondTime, setShowSecondTime] = useState(false);
  const [smsTesting, setSmsTesting] = useState(false);
  const [showSmsContent, setShowSmsContent] = useState(false);

  // Slack settings state
  const [slackSettings, setSlackSettings] = useState({
    enabled: false,
    webhookUrl: "",
    sendTime1: "08:00",
    template1: "MORNING",
    sendTime2: "",
    template2: "MORNING",
    includeWeight: true,
    includeWorkout: true,
    includeTransactions: true,
    includeBudget: true,
    includeWeeklyPlan: true,
  });
  const [showSlackSecondTime, setShowSlackSecondTime] = useState(false);
  const [showSlackContent, setShowSlackContent] = useState(false);
  const [slackTesting, setSlackTesting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/notifications/email-settings"),
      api.get("/backup/settings"),
      smsApi.getSettings(),
      slackApi.getSettings(),
    ])
      .then(([r, b, s, sl]) => {
        setSettings({
          enabled: r.data.enabled,
          sendTime: r.data.sendTime?.slice(0, 5) || "08:00",
          includeFinance: r.data.includeFinance,
          includeFitness: r.data.includeFitness,
          includeBudgetAlerts: r.data.includeBudgetAlerts,
          includeWeeklyPlan: r.data.includeWeeklyPlan,
        });
        setCustomEmail(r.data.customEmail || r.data.user?.email || "");
        setBackupEnabled(b.data.enabled);
        setBackupTime(b.data.backupTime?.slice(0, 5) || "00:00");
        setSmsSettings({
          enabled: s.data.enabled,
          phoneNumber: s.data.phoneNumber || "",
          sendTime1: s.data.sendTime1?.slice(0, 5) || "08:00",
          sendTime2: s.data.sendTime2?.slice(0, 5) || "",
          includeWeight: s.data.includeWeight,
          includeWorkout: s.data.includeWorkout,
          includeTransactions: s.data.includeTransactions,
          includeBudget: s.data.includeBudget,
          includeWeeklyPlan: s.data.includeWeeklyPlan,
        });
        if (s.data.sendTime2) setShowSecondTime(true);
        setSlackSettings({
          enabled: sl.data.enabled,
          webhookUrl: sl.data.webhookUrl || "",
          sendTime1: sl.data.sendTime1?.slice(0, 5) || "08:00",
          template1: sl.data.template1 || "MORNING",
          sendTime2: sl.data.sendTime2?.slice(0, 5) || "",
          template2: sl.data.template2 || "MORNING",
          includeWeight: sl.data.includeWeight,
          includeWorkout: sl.data.includeWorkout,
          includeTransactions: sl.data.includeTransactions,
          includeBudget: sl.data.includeBudget,
          includeWeeklyPlan: sl.data.includeWeeklyPlan,
        });
        if (sl.data.sendTime2) setShowSlackSecondTime(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put("/notifications/email-settings", {
        ...settings,
        customEmail,
      });
      setMessage({ text: "✅ Email settings saved successfully!", type: "success" });
    } catch {
      setMessage({ text: "❌ Failed to save settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const saveBackupSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put("/backup/settings", {
        enabled: backupEnabled,
        backupTime: backupTime.length === 5 ? backupTime + ":00" : backupTime
      });
      setMessage({ text: "✅ Backup settings saved!", type: "success" });
    } catch {
      setMessage({ text: "❌ Failed to save backup settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const r = await api.post("/notifications/email-settings/test");
      setMessage({ text: r.data, type: "success" });
    } catch {
      setMessage({ text: "❌ Failed to send test email.", type: "error" });
    } finally {
      setTesting(false);
    }
  };

  const toggle = (key: keyof typeof settings) =>
    setSettings((p) => ({ ...p, [key]: !p[key] }));

  const saveSmsSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await smsApi.updateSettings({
        ...smsSettings,
        sendTime1: smsSettings.sendTime1.length === 5 ? smsSettings.sendTime1 + ":00" : smsSettings.sendTime1,
        sendTime2: showSecondTime && smsSettings.sendTime2
          ? (smsSettings.sendTime2.length === 5 ? smsSettings.sendTime2 + ":00" : smsSettings.sendTime2)
          : null,
      });
      setMessage({ text: "✅ SMS settings saved successfully!", type: "success" });
    } catch {
      setMessage({ text: "❌ Failed to save SMS settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const sendTestSms = async () => {
    setSmsTesting(true);
    setMessage(null);
    try {
      const r = await smsApi.sendTest();
      setMessage({ text: r.data, type: "success" });
    } catch {
      setMessage({ text: "❌ Failed to send test SMS.", type: "error" });
    } finally {
      setSmsTesting(false);
    }
  };

  const toggleSms = (key: keyof typeof smsSettings) =>
    setSmsSettings((p) => ({ ...p, [key]: !p[key] }));

  const saveSlackSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await slackApi.updateSettings({
        ...slackSettings,
        sendTime1: slackSettings.sendTime1.length === 5 ? slackSettings.sendTime1 + ":00" : slackSettings.sendTime1,
        sendTime2: showSlackSecondTime && slackSettings.sendTime2
          ? (slackSettings.sendTime2.length === 5 ? slackSettings.sendTime2 + ":00" : slackSettings.sendTime2)
          : null,
      });
      setMessage({ text: "✅ Slack settings saved successfully!", type: "success" });
    } catch {
      setMessage({ text: "❌ Failed to save Slack settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const sendTestSlack = async () => {
    setSlackTesting(true);
    setMessage(null);
    try {
      const r = await slackApi.sendTest();
      setMessage({ text: r.data, type: "success" });
    } catch (err: any) {
      const msg = err.response?.data || "Failed to send test Slack message.";
      setMessage({ text: "❌ " + msg, type: "error" });
    } finally {
      setSlackTesting(false);
    }
  };

  const toggleSlack = (key: keyof typeof slackSettings) =>
    setSlackSettings((p) => ({ ...p, [key]: !p[key] }));

  if (loading)
    return (
      <div style={{ color: "var(--text-muted)", padding: 40 }}>Loading...</div>
    );

  const tabs: { key: Tab; icon: string; label: string; desc: string }[] = [
    { key: "appearance",     icon: "🎨", label: t('settings.appearance'), desc: t('settings.appearanceDesc') },
    { key: "authentication", icon: "🔐", label: "Authentication",          desc: "Password & 2FA settings" },
    { key: "email",          icon: "📧", label: t('settings.email'),       desc: t('settings.emailDesc') },
    { key: "sms",            icon: "💬", label: "SMS",                     desc: "Daily summary to your phone" },
    { key: "slack",          icon: "🟣", label: "Slack",                   desc: "Daily summary to Slack channel" },
    { key: "backup",         icon: "☁️", label: t('settings.backup'),      desc: t('settings.backupDesc') },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">{t('settings.title')}</h1>
        <p className="page-subtitle">{t('settings.subtitle')}</p>
      </div>

      {/* Tab cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 32,
        }}
      >
        {tabs.map((tab) => (
          <div
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setMessage(null);
            }}
            style={{
              background: "var(--bg-card)",
              border: `2px solid ${activeTab === tab.key ? "var(--primary)" : "var(--border)"}`,
              borderRadius: 16,
              padding: "20px 22px",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow:
                activeTab === tab.key ? "0 0 0 4px var(--primary-dim)" : "none",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{tab.icon}</div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color:
                  activeTab === tab.key
                    ? "var(--primary-light)"
                    : "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              {tab.label}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {tab.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Appearance tab */}
      {activeTab === "appearance" && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ color: "var(--text-primary)", marginBottom: 20 }}>{t('settings.theme')}</h3>

          {/* Theme toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{theme === "dark" ? "🌙" : "☀️"}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                  {theme === "dark" ? t('settings.darkMode') : t('settings.lightMode')}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {t('settings.savedAutomatically')}
                </div>
              </div>
            </div>
            <Toggle value={theme === "dark"} onChange={toggleTheme} />
          </div>

          {/* Language selector */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              {t('settings.language')}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
              {t('settings.languageDesc')}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {(['en', 'ta'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => i18n.changeLanguage(l)}
                  style={{
                    padding: "8px 20px", borderRadius: 8, border: "1.5px solid",
                    borderColor: lang === l ? "var(--primary)" : "var(--border)",
                    background: lang === l ? "var(--primary-dim)" : "var(--bg-elevated)",
                    color: lang === l ? "var(--primary-light)" : "var(--text-secondary)",
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                    fontFamily: l === 'ta' ? "'Noto Sans Tamil', 'Latha', sans-serif" : "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {l === 'en' ? t('settings.langEn') : t('settings.langTa')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Authentication tab */}
      {activeTab === "authentication" && <AuthenticationPage />}

      {/* Email tab */}
      {activeTab === "email" && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <div>
                <h3 style={{ color: "var(--text-primary)", marginBottom: 4 }}>
                  📧 Daily Email Notifications
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  Receive a daily summary to your email
                </p>
              </div>
              <Toggle
                value={settings.enabled}
                onChange={() => toggle("enabled")}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">SEND TIME (IST)</label>
              <input
                type="time"
                className="input"
                value={settings.sendTime}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, sendTime: e.target.value }))
                }
                style={{ maxWidth: 200 }}
              />
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 12,
                  marginTop: 6,
                }}
              >
                Format: HH:MM (e.g. 08:30 for 8:30 AM)
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">SEND EMAIL TO</label>
              <input
                type="email"
                className="input"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving..." : "💾 Save Settings"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowEmailContent(!showEmailContent)}
              >
                {showEmailContent ? "📋 Hide Content Settings" : "📋 Configure Email Content"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={sendTest}
                disabled={testing}
              >
                {testing ? "..." : "📧 Send Test"}
              </button>
            </div>
          </div>

          {showEmailContent && (
            <div className="card" style={{ marginBottom: 20, animation: "fadeIn 0.3s" }}>
              <h3 style={{ color: "var(--text-primary)", marginBottom: 20 }}>
                📋 What to Include
              </h3>
              {[
                {
                  key: "includeFinance" as const,
                  label: "💰 Finance Summary",
                  desc: "Monthly income, expenses and balance",
                },
                {
                  key: "includeBudgetAlerts" as const,
                  label: "🎯 Budget Alerts",
                  desc: "Warnings when over 80% of budget",
                },
                {
                  key: "includeFitness" as const,
                  label: "💪 Fitness Summary",
                  desc: "Total workouts and latest weight",
                },
                {
                  key: "includeWeeklyPlan" as const,
                  label: "📅 Today's Plan",
                  desc: "Your workout plan for today",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <p
                      style={{
                        color: "var(--text-primary)",
                        fontWeight: 500,
                        marginBottom: 2,
                      }}
                    >
                      {item.label}
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {item.desc}
                    </p>
                  </div>
                  <Toggle
                    value={settings[item.key]}
                    onChange={() => toggle(item.key)}
                  />
                </div>
              ))}
            </div>
          )}

          {message && (activeTab === "email") && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                marginBottom: 16,
                backgroundColor:
                  message.type === "success"
                    ? "rgba(138,159,74,0.1)"
                    : "rgba(192,57,43,0.1)",
                color:
                  message.type === "success"
                    ? "var(--primary-light)"
                    : "var(--danger)",
                border: `1px solid ${message.type === "success" ? "rgba(138,159,74,0.3)" : "rgba(192,57,43,0.3)"}`,
              }}
            >
              {message.text}
            </div>
          )}
        </>
      )}

      {/* SMS tab */}
      {activeTab === "sms" && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h3 style={{ color: "var(--text-primary)", marginBottom: 4 }}>💬 SMS Notifications</h3>
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  Receive a daily summary as SMS (powered by Fast2SMS)
                </p>
              </div>
              <Toggle value={smsSettings.enabled} onChange={() => toggleSms("enabled")} />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">PHONE NUMBER</label>
              <input
                type="tel"
                className="input"
                value={smsSettings.phoneNumber}
                onChange={(e) => setSmsSettings((p) => ({ ...p, phoneNumber: e.target.value }))}
                placeholder="10-digit mobile number (e.g. 9876543210)"
                style={{ maxWidth: 300 }}
              />
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
                Indian mobile number without country code
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">SEND TIME 1 (IST)</label>
              <input
                type="time"
                className="input"
                value={smsSettings.sendTime1}
                onChange={(e) => setSmsSettings((p) => ({ ...p, sendTime1: e.target.value }))}
                style={{ maxWidth: 200 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showSecondTime}
                  onChange={(e) => {
                    setShowSecondTime(e.target.checked);
                    if (!e.target.checked) setSmsSettings((p) => ({ ...p, sendTime2: "" }));
                  }}
                />
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Add second send time (optional)</span>
              </label>
            </div>

            {showSecondTime && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">SEND TIME 2 (IST)</label>
                <input
                  type="time"
                  className="input"
                  value={smsSettings.sendTime2}
                  onChange={(e) => setSmsSettings((p) => ({ ...p, sendTime2: e.target.value }))}
                  style={{ maxWidth: 200 }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveSmsSettings} disabled={saving}>
                {saving ? "Saving..." : "💾 Save Settings"}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowSmsContent(!showSmsContent)}>
                {showSmsContent ? "📋 Hide Content Settings" : "📋 Configure SMS Content"}
              </button>
              <button className="btn btn-secondary" onClick={sendTestSms} disabled={smsTesting}>
                {smsTesting ? "..." : "💬 Send Test SMS"}
              </button>
            </div>
          </div>

          {showSmsContent && (
            <div className="card" style={{ marginBottom: 20, animation: "fadeIn 0.3s" }}>
              <h3 style={{ color: "var(--text-primary)", marginBottom: 20 }}>📋 What to Include</h3>
              {[
                { key: "includeWeight" as const,       label: "⚖️ Weight",        desc: "Latest weight reading" },
                { key: "includeWorkout" as const,      label: "💪 Workouts",      desc: "Workout count this week" },
                { key: "includeTransactions" as const, label: "💰 Transactions",  desc: "Monthly expenses total" },
                { key: "includeBudget" as const,       label: "🎯 Budget Alerts", desc: "Categories over 80% usage" },
                { key: "includeWeeklyPlan" as const,   label: "📅 Today's Plan",  desc: "Workout plan for today" },
              ].map((item) => (
                <div
                  key={item.key}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid var(--border)" }}
                >
                  <div>
                    <p style={{ color: "var(--text-primary)", fontWeight: 500, marginBottom: 2 }}>{item.label}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12 }}>{item.desc}</p>
                  </div>
                  <Toggle value={smsSettings[item.key] as boolean} onChange={() => toggleSms(item.key)} />
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ color: "var(--text-primary)", marginBottom: 12 }}>📱 Sample SMS Preview</h3>
            <div style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: "14px 18px", fontFamily: "monospace", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {`OmniHub 17-Mar\n${smsSettings.includeWeight ? "Wt: 72.4kg\n" : ""}${smsSettings.includeWorkout ? "Workouts: 3 this wk\n" : ""}${smsSettings.includeTransactions ? "Spent: Rs.8500\n" : ""}${smsSettings.includeBudget ? "Food: 82%!\n" : ""}${smsSettings.includeWeeklyPlan ? "Today: Chest + Triceps" : ""}`.trim()}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20, borderLeft: "3px solid var(--primary)" }}>
            <h3 style={{ color: "var(--text-primary)", marginBottom: 8 }}>🔑 Setup Required</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
              SMS uses <strong style={{ color: "var(--text-primary)" }}>Fast2SMS</strong> (free for India).
              <br />1. Sign up at <strong>fast2sms.com</strong>
              <br />2. Copy your API key from the dashboard
              <br />3. Add it to Render env vars as <code style={{ background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4 }}>FAST2SMS_API_KEY</code>
            </p>
          </div>

          {message && activeTab === "sms" && (
            <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16, backgroundColor: message.type === "success" ? "rgba(138,159,74,0.1)" : "rgba(192,57,43,0.1)", color: message.type === "success" ? "var(--primary-light)" : "var(--danger)", border: `1px solid ${message.type === "success" ? "rgba(138,159,74,0.3)" : "rgba(192,57,43,0.3)"}` }}>
              {message.text}
            </div>
          )}
        </>
      )}

      {/* Slack tab */}
      {activeTab === "slack" && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h3 style={{ color: "var(--text-primary)", marginBottom: 4 }}>🟣 Slack Notifications</h3>
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  Receive a rich daily summary in your Slack channel
                </p>
              </div>
              <Toggle value={slackSettings.enabled} onChange={() => toggleSlack("enabled")} />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">WEBHOOK URL</label>
              <input
                type="url"
                className="input"
                value={slackSettings.webhookUrl}
                onChange={(e) => setSlackSettings((p) => ({ ...p, webhookUrl: e.target.value }))}
                placeholder="https://hooks.slack.com/services/T.../B.../..."
              />
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
                Get this from: Slack → Apps → Incoming Webhooks → Add New Webhook
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">SEND TIME 1 (IST)</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="time"
                  className="input"
                  value={slackSettings.sendTime1}
                  onChange={(e) => setSlackSettings((p) => ({ ...p, sendTime1: e.target.value }))}
                  style={{ maxWidth: 160 }}
                />
                <FilterDropdown
                  value={slackSettings.template1}
                  options={[
                    { label: '🌅 Morning Summary', value: 'MORNING' },
                    { label: '💰 Finance Summary', value: 'FINANCE' },
                    { label: '📊 Full Summary', value: 'FULL' },
                  ]}
                  onChange={(v) => setSlackSettings((p) => ({ ...p, template1: v as string }))}
                  minWidth={200}
                />
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
                Morning: weight goal + full week plan + steps &nbsp;|&nbsp; Finance: income + budgets &nbsp;|&nbsp; Full: everything
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showSlackSecondTime}
                  onChange={(e) => {
                    setShowSlackSecondTime(e.target.checked);
                    if (!e.target.checked) setSlackSettings((p) => ({ ...p, sendTime2: "" }));
                  }}
                />
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Add second send time (optional)</span>
              </label>
            </div>

            {showSlackSecondTime && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">SEND TIME 2 (IST)</label>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="time"
                    className="input"
                    value={slackSettings.sendTime2}
                    onChange={(e) => setSlackSettings((p) => ({ ...p, sendTime2: e.target.value }))}
                    style={{ maxWidth: 160 }}
                  />
                  <FilterDropdown
                    value={slackSettings.template2}
                    options={[
                      { label: '🌅 Morning Summary', value: 'MORNING' },
                      { label: '💰 Finance Summary', value: 'FINANCE' },
                      { label: '📊 Full Summary', value: 'FULL' },
                    ]}
                    onChange={(v) => setSlackSettings((p) => ({ ...p, template2: v as string }))}
                    minWidth={200}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveSlackSettings} disabled={saving}>
                {saving ? "Saving..." : "💾 Save Settings"}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowSlackContent(!showSlackContent)}>
                {showSlackContent ? "📋 Hide Content Settings" : "📋 Configure Slack Content"}
              </button>
              <button className="btn btn-secondary" onClick={sendTestSlack} disabled={slackTesting}>
                {slackTesting ? "..." : "🟣 Send Test Message"}
              </button>
            </div>
          </div>

          {showSlackContent && (
            <div className="card" style={{ marginBottom: 20, animation: "fadeIn 0.3s" }}>
              <h3 style={{ color: "var(--text-primary)", marginBottom: 20 }}>📋 What to Include</h3>
              {[
                { key: "includeWeight" as const,       label: "⚖️ Weight",        desc: "Latest weight reading" },
                { key: "includeWorkout" as const,      label: "💪 Workout Plan",  desc: "Full week workout plan (Mon–Sun) with today highlighted" },
                { key: "includeTransactions" as const, label: "💰 Finance",       desc: "Monthly income, expenses, balance" },
                { key: "includeBudget" as const,       label: "🎯 Budget Status", desc: "All categories with usage percentage" },
                { key: "includeWeeklyPlan" as const,   label: "👟 Steps & Run",   desc: "Today's steps target and logged count" },
              ].map((item) => (
                <div
                  key={item.key}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid var(--border)" }}
                >
                  <div>
                    <p style={{ color: "var(--text-primary)", fontWeight: 500, marginBottom: 2 }}>{item.label}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12 }}>{item.desc}</p>
                  </div>
                  <Toggle value={slackSettings[item.key] as boolean} onChange={() => toggleSlack(item.key)} />
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ marginBottom: 20, borderLeft: "3px solid #7c3aed" }}>
            <h3 style={{ color: "var(--text-primary)", marginBottom: 12 }}>🔑 Setup — 3 Steps</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 2 }}>
              1. Go to <strong style={{ color: "var(--text-primary)" }}>api.slack.com/apps</strong> → Create New App → From Scratch<br />
              2. Enable <strong style={{ color: "var(--text-primary)" }}>Incoming Webhooks</strong> → Add New Webhook to Workspace → pick a channel<br />
              3. Copy the webhook URL → paste above → Save → Send Test
            </p>
          </div>

          {message && activeTab === "slack" && (
            <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16, backgroundColor: message.type === "success" ? "rgba(138,159,74,0.1)" : "rgba(192,57,43,0.1)", color: message.type === "success" ? "var(--primary-light)" : "var(--danger)", border: `1px solid ${message.type === "success" ? "rgba(138,159,74,0.3)" : "rgba(192,57,43,0.3)"}` }}>
              {message.text}
            </div>
          )}
        </>
      )}

      {/* Backup tab */}
      {activeTab === "backup" && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <div>
                <h3 style={{ color: "var(--text-primary)", marginBottom: 4 }}>
                  ☁️ Auto Backup Settings
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  Automatically back up your data to OneDrive
                </p>
              </div>
              <Toggle
                value={backupEnabled}
                onChange={() => setBackupEnabled((p) => !p)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">BACKUP TIME (IST)</label>
              <input
                type="time"
                className="input"
                value={backupTime}
                onChange={(e) => setBackupTime(e.target.value)}
                style={{ maxWidth: 200 }}
              />
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 12,
                  marginTop: 6,
                }}
              >
                Default: 12:00 AM — runs once daily
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={saveBackupSettings}
                disabled={saving}
              >
                {saving ? "Saving..." : "💾 Save Settings"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowBackupInfo(!showBackupInfo)}
              >
                {showBackupInfo ? "📂 Hide Info" : "📂 Backup Details"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? "📊 Hide History" : "📊 View History & Stats"}
              </button>
            </div>
          </div>

          {showBackupInfo && (
            <div style={{ animation: "fadeIn 0.3s" }}>
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ color: "var(--text-primary)", marginBottom: 20 }}>
                  📂 What Gets Backed Up
                </h3>
                {[
                  {
                    icon: "💸",
                    label: "Transactions",
                    desc: "All income and expense records",
                  },
                  { icon: "🎯", label: "Budget & Spend", desc: "Monthly budget limits" },
                  {
                    icon: "💪",
                    label: "Workout Logs",
                    desc: "All workout sessions and sets",
                  },
                  {
                    icon: "⚖️",
                    label: "Weight Logs",
                    desc: "Daily weight tracking records",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontSize: 20, width: 32, textAlign: "center" }}>
                      {item.icon}
                    </div>
                    <div>
                      <p
                        style={{
                          color: "var(--text-primary)",
                          fontWeight: 500,
                          marginBottom: 2,
                        }}
                      >
                        {item.label}
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {item.desc}
                      </p>
                    </div>
                    <div style={{ marginLeft: "auto" }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: "var(--primary-dim)",
                          color: "var(--primary-light)",
                          fontWeight: 700,
                        }}
                      >
                        Always
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ color: "var(--text-primary)", marginBottom: 8 }}>
                  📁 Drive Folder Structure
                </h3>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  Auto-created — you never need to touch anything
                </p>
                <div
                  style={{
                    background: "var(--bg-elevated)",
                    borderRadius: 10,
                    padding: "14px 18px",
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 2,
                  }}
                >
                  OneDrive / OmniHub / 2026 / March / Week-2 / 13-Mar-2026.json
                  <br />
                  OneDrive / OmniHub / 2026 / April / Week-1 / 01-Apr-2026.json
                  <br />
                  OneDrive / OmniHub / 2027 / January / Week-1 / 01-Jan-2027.json
                </div>
              </div>
            </div>
          )}

          {message && (activeTab === "backup") && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                marginBottom: 16,
                backgroundColor:
                  message.type === "success"
                    ? "rgba(138,159,74,0.1)"
                    : "rgba(192,57,43,0.1)",
                color:
                  message.type === "success"
                    ? "var(--primary-light)"
                    : "var(--danger)",
                border: `1px solid ${message.type === "success" ? "rgba(138,159,74,0.3)" : "rgba(192,57,43,0.3)"}`,
              }}
            >
              {message.text}
            </div>
          )}

          {showHistory && (
            <div style={{ marginTop: 12, animation: "fadeIn 0.3s" }}>
              <BackupPage />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SettingsPage;
