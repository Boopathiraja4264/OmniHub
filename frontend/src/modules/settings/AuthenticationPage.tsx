import React, { useState, useEffect } from "react";
import { authApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const Eye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

interface TwoFAStatus {
  method: string;
  totpEnabled: boolean;
  backupCodesRemaining: number;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="card" style={{ marginBottom: 20 }}>
    <h3 style={{ color: "var(--text-primary)", marginBottom: 20, fontSize: 16 }}>{title}</h3>
    {children}
  </div>
);

const AuthenticationPage: React.FC = () => {
  const { user } = useAuth();
  const isSsoUser = !!(user?.oauthProvider && user.oauthProvider !== '');

  const [status, setStatus] = useState<TwoFAStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Change / Set password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // TOTP setup
  const [totpSetupData, setTotpSetupData] = useState<{ qrCode: string; secret: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpBackupCodes, setTotpBackupCodes] = useState<string[]>([]);
  const [totpMsg, setTotpMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [totpLoading, setTotpLoading] = useState(false);

  // 2FA setup
  const [twoFAMsg, setTwoFAMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [twoFALoading, setTwoFALoading] = useState(false);

  useEffect(() => {
    authApi.get2FAStatus()
      .then(({ data }) => setStatus(data))
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, []);

  const refreshStatus = () => {
    authApi.get2FAStatus().then(({ data }) => setStatus(data)).catch(() => {});
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) { setPwMsg({ text: "Passwords do not match", type: "error" }); return; }
    if (newPw.length < 8) { setPwMsg({ text: "Password must be at least 8 characters", type: "error" }); return; }
    setPwLoading(true);
    try {
      if (isSsoUser) {
        await authApi.setPassword(newPw);
        setPwMsg({ text: "Password set! You can now log in with email + password.", type: "success" });
      } else {
        await authApi.changePassword(currentPw, newPw);
        setPwMsg({ text: "Password changed successfully", type: "success" });
        setCurrentPw("");
      }
      setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      setPwMsg({ text: err.response?.data?.error || "Failed to update password", type: "error" });
    } finally {
      setPwLoading(false);
    }
  };

  const handleSetupTotp = async () => {
    setTotpLoading(true); setTotpMsg(null);
    try {
      const { data } = await authApi.setupTotp();
      setTotpSetupData({ qrCode: data.qrCodeDataUrl, secret: data.secret });
    } catch (err: any) {
      setTotpMsg({ text: err.response?.data?.error || "Failed to start TOTP setup", type: "error" });
    } finally {
      setTotpLoading(false);
    }
  };

  const handleVerifyTotpSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpLoading(true); setTotpMsg(null);
    try {
      const { data } = await authApi.verifyTotpSetup(totpCode);
      setTotpBackupCodes(data.backupCodes || []);
      setTotpSetupData(null); setTotpCode("");
      setTotpMsg({ text: "TOTP 2FA enabled! Save your backup codes.", type: "success" });
      refreshStatus();
    } catch (err: any) {
      setTotpMsg({ text: err.response?.data?.error || "Invalid code", type: "error" });
    } finally {
      setTotpLoading(false);
    }
  };

  const handleSetup2FA = async (method: "email-otp" | "sms-otp" | "push") => {
    setTwoFALoading(true); setTwoFAMsg(null);
    try {
      const callMap = { "email-otp": authApi.setupEmailOtp, "sms-otp": authApi.setupSmsOtp, "push": authApi.setupPush };
      await callMap[method]();
      setTwoFAMsg({ text: `${method.toUpperCase().replace("-", " ")} 2FA enabled`, type: "success" });
      refreshStatus();
    } catch (err: any) {
      setTwoFAMsg({ text: err.response?.data?.error || "Failed to enable", type: "error" });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm("Disable two-factor authentication? Your account will be less secure.")) return;
    setTwoFALoading(true); setTwoFAMsg(null);
    try {
      await authApi.disable2FA();
      setTwoFAMsg({ text: "2FA disabled", type: "success" });
      setTotpBackupCodes([]);
      refreshStatus();
    } catch (err: any) {
      setTwoFAMsg({ text: err.response?.data?.error || "Failed to disable", type: "error" });
    } finally {
      setTwoFALoading(false);
    }
  };

  if (loadingStatus) return <div style={{ color: "var(--text-muted)", padding: 40 }}>Loading...</div>;

  const active2FA = status?.method && status.method !== "NONE" ? status.method : null;

  return (
    <div>
      {/* Change / Set Password */}
      <Section title={isSsoUser ? "🔑 Set Password" : "🔑 Change Password"}>
        {isSsoUser && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 8, borderLeft: '3px solid #6a8fe8' }}>
            You signed in with <strong>{user?.oauthProvider}</strong>. Set a password to also log in with your email and password.
          </p>
        )}
        <form onSubmit={handleChangePassword}>
          {!isSsoUser && (
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">CURRENT PASSWORD</label>
              <div style={{ position: 'relative', maxWidth: 360 }}>
                <input type={showCurrentPw ? "text" : "password"} className="input" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required style={{ width: '100%', paddingRight: 40 }} />
                <button type="button" onClick={() => setShowCurrentPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}>
                  {showCurrentPw ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">NEW PASSWORD</label>
            <div style={{ position: 'relative', maxWidth: 360 }}>
              <input type={showNewPw ? "text" : "password"} className="input" value={newPw} onChange={e => setNewPw(e.target.value)} required style={{ width: '100%', paddingRight: 40 }} />
              <button type="button" onClick={() => setShowNewPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}>
                {showNewPw ? <EyeOff /> : <Eye />}
              </button>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>Min 8 chars, 1 uppercase, 1 number</p>
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">CONFIRM NEW PASSWORD</label>
            <div style={{ position: 'relative', maxWidth: 360 }}>
              <input type={showConfirmPw ? "text" : "password"} className="input" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required style={{ width: '100%', paddingRight: 40 }} />
              <button type="button" onClick={() => setShowConfirmPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}>
                {showConfirmPw ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>
          {pwMsg && <StatusMsg msg={pwMsg} />}
          <button type="submit" className="btn btn-primary" disabled={pwLoading}>
            {pwLoading ? "Saving..." : isSsoUser ? "Set Password" : "Update Password"}
          </button>
        </form>
      </Section>

      {/* 2FA Status */}
      <Section title="🔐 Two-Factor Authentication">
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
              {active2FA ? `Active: ${formatMethod(active2FA)}` : "Not configured"}
            </p>
            {active2FA === "TOTP" && status && (
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {status.backupCodesRemaining} backup code{status.backupCodesRemaining !== 1 ? "s" : ""} remaining
              </p>
            )}
          </div>
          <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: active2FA ? "var(--primary-dim)" : "rgba(192,57,43,0.15)",
            color: active2FA ? "var(--primary-light)" : "var(--danger)" }}>
            {active2FA ? "ENABLED" : "DISABLED"}
          </span>
        </div>

        {/* TOTP (Authenticator App) */}
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>Authenticator App (TOTP)</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Google Authenticator, Authy, 1Password, etc.</p>
            </div>
            {active2FA !== "TOTP" && (
              <button className="btn btn-secondary" onClick={handleSetupTotp} disabled={totpLoading}>
                {totpLoading ? "..." : "Set Up"}
              </button>
            )}
          </div>

          {totpSetupData && (
            <div style={{ background: "var(--bg-elevated)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
                Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
              </p>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <img src={totpSetupData.qrCode} alt="TOTP QR Code" style={{ width: 200, height: 200, borderRadius: 12, background: "white", padding: 8 }} />
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 16 }}>
                Manual entry: <code style={{ background: "var(--bg-card)", padding: "2px 6px", borderRadius: 4, letterSpacing: 2 }}>{totpSetupData.secret}</code>
              </p>
              <form onSubmit={handleVerifyTotpSetup} style={{ display: "flex", gap: 10 }}>
                <input className="input" type="text" value={totpCode} onChange={e => setTotpCode(e.target.value)}
                  placeholder="Enter 6-digit code" maxLength={6} required style={{ flex: 1, textAlign: "center", letterSpacing: 6, fontSize: 18 }} />
                <button type="submit" className="btn btn-primary" disabled={totpLoading}>
                  {totpLoading ? "..." : "Confirm"}
                </button>
              </form>
            </div>
          )}

          {totpBackupCodes.length > 0 && (
            <div style={{ background: "rgba(138,159,74,0.08)", border: "1px solid rgba(138,159,74,0.25)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ fontWeight: 600, color: "var(--primary-light)", marginBottom: 12 }}>
                Save these backup codes — they won't be shown again:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontFamily: "monospace", fontSize: 13 }}>
                {totpBackupCodes.map((c, i) => (
                  <span key={i} style={{ background: "var(--bg-elevated)", padding: "6px 10px", borderRadius: 6, color: "var(--text-primary)" }}>{c}</span>
                ))}
              </div>
              <button className="btn btn-secondary" style={{ marginTop: 14, fontSize: 12 }}
                onClick={() => navigator.clipboard.writeText(totpBackupCodes.join("\n"))}>
                Copy All
              </button>
            </div>
          )}
        </div>

        {/* Email OTP */}
        <TwoFAOption
          label="Email OTP" desc="Receive a one-time code to your email on each login."
          icon="📧" method="EMAIL_OTP" active={active2FA}
          onEnable={() => handleSetup2FA("email-otp")} loading={twoFALoading}
        />

        {/* SMS OTP */}
        <TwoFAOption
          label="SMS OTP" desc="Receive a one-time code via SMS on each login."
          icon="💬" method="SMS_OTP" active={active2FA}
          onEnable={() => handleSetup2FA("sms-otp")} loading={twoFALoading}
        />

        {/* Push Approval */}
        <TwoFAOption
          label="Push Approval" desc="Get an email to approve/deny login. If push times out, enter your authenticator app OTP as fallback."
          icon="📱" method="PUSH" active={active2FA}
          onEnable={() => handleSetup2FA("push")} loading={twoFALoading}
        />

        {twoFAMsg && <StatusMsg msg={twoFAMsg} />}
        {totpMsg && <StatusMsg msg={totpMsg} />}

        {active2FA && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border-subtle)" }}>
            <button className="btn" style={{ background: "rgba(192,57,43,0.15)", color: "var(--danger)", border: "1px solid rgba(192,57,43,0.3)" }}
              onClick={handleDisable2FA} disabled={twoFALoading}>
              Disable 2FA
            </button>
          </div>
        )}
      </Section>
    </div>
  );
};

const TwoFAOption: React.FC<{
  label: string; desc: string; icon: string;
  method: string; active: string | null;
  onEnable: () => void; loading: boolean;
}> = ({ label, desc, icon, method, active, onEnable, loading }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderTop: "1px solid var(--border-subtle)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</p>
      </div>
    </div>
    {active === method ? (
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary-light)", padding: "4px 12px", borderRadius: 20, background: "var(--primary-dim)" }}>ACTIVE</span>
    ) : (
      <button className="btn btn-secondary" onClick={onEnable} disabled={loading} style={{ fontSize: 12 }}>
        {loading ? "..." : "Enable"}
      </button>
    )}
  </div>
);

const StatusMsg: React.FC<{ msg: { text: string; type: "success" | "error" } }> = ({ msg }) => (
  <div style={{
    padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 13,
    background: msg.type === "success" ? "rgba(138,159,74,0.1)" : "rgba(192,57,43,0.1)",
    color: msg.type === "success" ? "var(--primary-light)" : "var(--danger)",
    border: `1px solid ${msg.type === "success" ? "rgba(138,159,74,0.3)" : "rgba(192,57,43,0.3)"}`,
  }}>
    {msg.text}
  </div>
);

function formatMethod(method: string) {
  const map: Record<string, string> = { TOTP: "Authenticator App", EMAIL_OTP: "Email OTP", SMS_OTP: "SMS OTP", PUSH: "Push Approval" };
  return map[method] || method;
}

export default AuthenticationPage;
