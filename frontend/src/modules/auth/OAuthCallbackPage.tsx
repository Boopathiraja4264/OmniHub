import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api";

const OAuthCallbackPage: React.FC = () => {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      navigate("/login?error=oauth_failed", { replace: true });
      return;
    }

    authApi.exchangeOauthCode(code)
      .then(() => authApi.getMe())
      .then(({ data }) => {
        loginWithToken({ email: data.email, fullName: data.fullName, oauthProvider: data.oauthProvider || '' });
        navigate("/home", { replace: true });
      })
      .catch(() => {
        navigate("/login?error=oauth_failed", { replace: true });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)" }}>
      Signing you in...
    </div>
  );
};

export default OAuthCallbackPage;
