import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(fullName, email, password);
      }
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong");
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
            <div style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, color: 'white' }}>
                {isLogin ? 'Sign In' : 'Join Us'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginTop: 12 }}>
                {isLogin ? 'Welcome back to OmniHub.' : 'Create your secure account.'}
              </p>
            </div>

            {error && (
              <div style={{
                marginBottom: 24, padding: 16, borderRadius: 16,
                background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)',
                color: '#ff8a80', fontSize: 14, fontWeight: 500
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <input
                  className="input-glass"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  required
                />
              )}
              <input
                className="input-glass"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                required
              />
              <input
                className="input-glass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
              <button type="submit" className="btn-gold" disabled={loading}>
                {loading ? "Authenticating..." : isLogin ? "Access Dashboard" : "Create Account"}
              </button>
            </form>

            <div style={{ marginTop: 40, textAlign: 'right', fontSize: 14 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                {isLogin ? "No account? " : "Already joined? "}
              </span>
              <button
                type="button"
                style={{
                  background: 'none', border: 'none', color: '#a8be5a',
                  fontWeight: 800, cursor: 'pointer', marginLeft: 8,
                  textDecoration: 'underline', textUnderlineOffset: '4px',
                  fontSize: 14
                }}
                onClick={() => { setIsLogin(!isLogin); setError(""); }}
              >
                {isLogin ? "Register now" : "Login here"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
