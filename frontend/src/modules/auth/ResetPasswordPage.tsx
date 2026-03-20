import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../services/api";

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="aurora-container">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
        <div className="aurora-blob blob-3"></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
        <div style={{
          background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24,
          padding: "40px 48px", width: "100%", maxWidth: 440,
        }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 20 }}>✅</div>
              <h2 style={{ color: "white", fontSize: 24, marginBottom: 12 }}>Password Reset!</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 28 }}>
                Your password has been updated. You can now sign in.
              </p>
              <button onClick={() => navigate("/login")} className="btn-gold">Go to Login</button>
            </div>
          ) : (
            <>
              <h2 style={{ color: "white", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>New Password</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 28 }}>
                Choose a strong password (min 8 chars, 1 uppercase, 1 number).
              </p>
              {error && (
                <div style={{ marginBottom: 20, padding: 14, borderRadius: 12, background: "rgba(192,57,43,0.15)", border: "1px solid rgba(192,57,43,0.3)", color: "#ff8a80", fontSize: 14 }}>
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <input className="input-glass" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="New Password" required />
                <input className="input-glass" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm Password" required />
                <button type="submit" className="btn-gold" disabled={loading || !token}>
                  {loading ? "Saving..." : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
