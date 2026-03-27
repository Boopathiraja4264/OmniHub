import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../services/api";

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

type Step = "login" | "register" | "verify-email" | "2fa" | "forgot-password" | "reset-sent";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const SSOButton: React.FC<{ provider: string; label: string; logo: React.ReactNode }> = ({ provider, label, logo }) => (
  <a
    href={`${BASE_URL}/oauth2/authorization/${provider}`}
    style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      padding: "11px 0", borderRadius: 12,
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
      color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 500,
      textDecoration: "none", cursor: "pointer", transition: "background 0.15s",
    }}
    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
  >
    {logo} {label}
  </a>
);

const AuthPage: React.FC = () => {
  const [step, setStep] = useState<Step>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [twoFAMethod, setTwoFAMethod] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [pushPolling, setPushPolling] = useState(false);
  const [pushFallback, setPushFallback] = useState(false);
  const [pushCountdown, setPushCountdown] = useState(30);

  const { login, register, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle OAuth error redirect
  useEffect(() => {
    if (searchParams.get("error") === "oauth_failed") {
      setError("SSO login failed. Please try again or use email/password.");
    }
  }, [searchParams]);

  // Poll push approval
  useEffect(() => {
    if (step !== "2fa" || twoFAMethod !== "PUSH" || !challengeToken || pushFallback) return;
    setPushPolling(true);
    const interval = setInterval(async () => {
      try {
        const { data } = await authApi.pollPush(challengeToken);
        if (data.status === "APPROVED") {
          clearInterval(interval);
          const { data: authData } = await authApi.verify2FA(tempToken, "", "PUSH", challengeToken);
          loginWithToken(authData);
          navigate("/home");
        } else if (data.status === "DENIED") {
          clearInterval(interval);
          setPushPolling(false);
          setError("Login was denied. You can enter your authenticator code below.");
          setPushFallback(true);
        }
      } catch {
        clearInterval(interval);
        setPushPolling(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [step, twoFAMethod, challengeToken, tempToken, loginWithToken, navigate, pushFallback]);

  // Push 30-second countdown → auto-switch to OTP fallback
  useEffect(() => {
    if (step !== "2fa" || twoFAMethod !== "PUSH" || pushFallback) return;
    setPushCountdown(30);
    const timer = setInterval(() => {
      setPushCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setPushFallback(true);
          setPushPolling(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, twoFAMethod, pushFallback]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await login(email, password);
      if (data.requiresEmailVerification) {
        setStep("verify-email");
      } else if (data.twoFactorRequired) {
        setTwoFAMethod(data.twoFactorMethod || "");
        setTempToken(data.tempToken || "");
        setChallengeToken(data.challengeToken || "");
        setStep("2fa");
        if (data.twoFactorMethod === "PUSH") {
          setInfo("A push notification has been sent to your registered device. Approve it to log in.");
        } else if (data.twoFactorMethod === "EMAIL_OTP") {
          setInfo("A one-time code has been sent to your email.");
        } else if (data.twoFactorMethod === "SMS_OTP") {
          setInfo("A one-time code has been sent to your phone.");
        }
      } else {
        navigate("/home");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await register(fullName, email, password);
      setStep("verify-email");
      setInfo("We sent a 6-digit verification code to " + email);
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data } = await authApi.verifyEmail(email, otp);
      loginWithToken(data);
      navigate("/home");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(""); setInfo("");
    try {
      await authApi.resendVerification(email);
      setInfo("Verification code resent.");
    } catch {
      setError("Failed to resend code.");
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data } = await authApi.verify2FA(tempToken, twoFACode, twoFAMethod, challengeToken);
      loginWithToken(data);
      navigate("/home");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail);
      setStep("reset-sent");
    } catch {
      setStep("reset-sent"); // same response to avoid email enumeration
    } finally {
      setLoading(false);
    }
  };

  const ssoProviders = [
    {
      provider: "google", label: "Continue with Google",
      logo: <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>,
    },
    {
      provider: "github", label: "Continue with GitHub",
      logo: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/></svg>,
    },
    {
      provider: "microsoft-sso", label: "Continue with Microsoft",
      logo: <svg width="18" height="18" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>,
    },
    {
      provider: "linkedin", label: "Continue with LinkedIn",
      logo: <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    },
  ];

  const renderStep = () => {
    if (step === "verify-email") {
      return (
        <>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: 'white' }}>Verify Email</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginTop: 12 }}>
              Enter the 6-digit code sent to {email}
            </p>
          </div>
          {error && <ErrorBanner message={error} />}
          {info && <InfoBanner message={info} />}
          <form onSubmit={handleVerifyEmail}>
            <input className="input-glass" type="text" value={otp} onChange={e => setOtp(e.target.value)}
              placeholder="6-digit code" maxLength={6} required style={{ letterSpacing: 6, textAlign: 'center', fontSize: 22 }} />
            <button type="submit" className="btn-gold" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </form>
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            Didn't receive it?{" "}
            <button type="button" onClick={handleResendOtp}
              style={{ background: 'none', border: 'none', color: '#a8be5a', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              Resend code
            </button>
          </div>
        </>
      );
    }

    if (step === "2fa") {
      const showCodeInput = twoFAMethod !== "PUSH" || pushFallback;
      return (
        <>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: 'white' }}>Two-Factor Auth</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginTop: 12 }}>
              {twoFAMethod === "TOTP" ? "Enter the code from your authenticator app." :
               twoFAMethod === "PUSH" && !pushFallback ? "Check your email to approve this login." :
               twoFAMethod === "PUSH" && pushFallback ? "Enter the code from your authenticator app." :
               "Enter the code sent to your " + (twoFAMethod === "SMS_OTP" ? "phone" : "email") + "."}
            </p>
          </div>
          {error && <ErrorBanner message={error} />}
          {info && <InfoBanner message={info} />}

          {/* PUSH waiting state */}
          {twoFAMethod === "PUSH" && !pushFallback && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 8 }}>
                Approval email sent — click Approve in that email.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 20 }}>
                Waiting{pushPolling ? "..." : ""} • Falls back to OTP in {pushCountdown}s
              </p>
              <button type="button" onClick={() => { setPushFallback(true); setPushPolling(false); }}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', fontSize: 13, padding: '8px 18px', borderRadius: 10 }}>
                Use authenticator code instead
              </button>
            </div>
          )}

          {/* Code input (TOTP / EMAIL_OTP / SMS_OTP / PUSH fallback) */}
          {showCodeInput && (
            <form onSubmit={handleVerify2FA}>
              <input className="input-glass" type="text" value={twoFACode} onChange={e => setTwoFACode(e.target.value)}
                placeholder="Enter 6-digit code" maxLength={10} required
                style={{ letterSpacing: 4, textAlign: 'center', fontSize: 20 }} autoFocus />
              <button type="submit" className="btn-gold" disabled={loading}>
                {loading ? "Verifying..." : "Verify"}
              </button>
            </form>
          )}

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button type="button" onClick={() => { setStep("login"); setError(""); setInfo(""); setPushFallback(false); setPushPolling(false); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13 }}>
              Back to login
            </button>
          </div>
        </>
      );
    }

    if (step === "forgot-password") {
      return (
        <>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: 'white' }}>Reset Password</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginTop: 12 }}>
              Enter your email to receive a reset link.
            </p>
          </div>
          {error && <ErrorBanner message={error} />}
          <form onSubmit={handleForgotPassword}>
            <input className="input-glass" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
              placeholder="Email Address" required />
            <button type="submit" className="btn-gold" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button type="button" onClick={() => { setStep("login"); setError(""); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13 }}>
              Back to login
            </button>
          </div>
        </>
      );
    }

    if (step === "reset-sent") {
      return (
        <>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 20 }}>📧</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 12 }}>Check your email</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.7 }}>
              If that email exists, we've sent a reset link. Check your inbox and spam folder.
            </p>
            <button type="button" onClick={() => { setStep("login"); setError(""); }}
              style={{ marginTop: 28, background: 'none', border: 'none', color: '#a8be5a', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              Back to login
            </button>
          </div>
        </>
      );
    }

    // Login / Register
    const isLogin = step === "login";
    return (
      <>
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, color: 'white' }}>
            {isLogin ? 'Sign In' : 'Join Us'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginTop: 12 }}>
            {isLogin ? 'Welcome back to OmniHub.' : 'Create your secure account.'}
          </p>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* SSO buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {ssoProviders.map(p => (
            <SSOButton key={p.provider} provider={p.provider} label={p.label} logo={p.logo} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>or continue with email</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          {!isLogin && (
            <input className="input-glass" type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Full Name" required />
          )}
          <input className="input-glass" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email Address" required />
          <div style={{ position: 'relative' }}>
            <input className="input-glass" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" required style={{ paddingRight: 44, width: '100%' }} />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0, lineHeight: 1, display: 'flex' }}>
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {isLogin && (
            <div style={{ textAlign: 'right', marginBottom: 16, marginTop: -8 }}>
              <button type="button" onClick={() => { setStep("forgot-password"); setForgotEmail(email); setError(""); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13 }}>
                Forgot password?
              </button>
            </div>
          )}
          <button type="submit" className="btn-gold" disabled={loading}>
            {loading ? "Authenticating..." : isLogin ? "Let's Go" : "Create Account"}
          </button>
        </form>

        <div style={{ marginTop: 32, textAlign: 'right', fontSize: 14 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>
            {isLogin ? "No account? " : "Already joined? "}
          </span>
          <button type="button"
            style={{ background: 'none', border: 'none', color: '#a8be5a', fontWeight: 800, cursor: 'pointer', marginLeft: 8, textDecoration: 'underline', textUnderlineOffset: '4px', fontSize: 14 }}
            onClick={() => { setStep(isLogin ? "register" : "login"); setError(""); }}>
            {isLogin ? "Register now" : "Login here"}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="auth-page">
      <div className="aurora-container">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
        <div className="aurora-blob blob-3"></div>
      </div>
      <div className="particles">
        {Array.from({ length: 10 }).map((_, i) => <div key={i} className="particle" />)}
      </div>

      <div className="palm-floating">🌴</div>

      <div className="floating-screen">
        <div className="hero-side">
          <h1 className="hero-text">
            Balance <br />
            <span className="gold-text">Redefined.</span>
          </h1>
          <p style={{ fontSize: 22, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, maxWidth: 500 }}>
            Experience the future of personal growth.
            A seamless ecosystem for your body and your business.
          </p>
        </div>

        <div className="login-side">
          <div className="form-wrapper">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
};

const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    marginBottom: 20, padding: 14, borderRadius: 14,
    background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)',
    color: '#ff8a80', fontSize: 14, fontWeight: 500
  }}>
    {message}
  </div>
);

const InfoBanner: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    marginBottom: 20, padding: 14, borderRadius: 14,
    background: 'rgba(138,159,74,0.12)', border: '1px solid rgba(138,159,74,0.3)',
    color: '#c5d95a', fontSize: 14
  }}>
    {message}
  </div>
);

export default AuthPage;
