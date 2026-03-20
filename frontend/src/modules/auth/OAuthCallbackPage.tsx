import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const OAuthCallbackPage: React.FC = () => {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("token");
    const email = params.get("email");
    const fullName = params.get("name") || "";

    if (token && email) {
      loginWithToken({ token, email, fullName });
      navigate("/", { replace: true });
    } else {
      navigate("/login?error=oauth_failed", { replace: true });
    }
  }, [loginWithToken, navigate]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)" }}>
      Signing you in...
    </div>
  );
};

export default OAuthCallbackPage;
