import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthContext";
import { SelectorIdioma } from "@/components/SelectorIdioma";
import { LogoDigivend } from "@/components/LogoDigivend";

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(false);
    setEnviando(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError(true);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-marca">
        <LogoDigivend size={44} />
        <p className="login-producto">
          {t("app.name")} <span>· {t("app.tagline")}</span>
        </p>
      </div>
      <form className="login-card" onSubmit={onSubmit}>
        <h2>{t("login.title")}</h2>
        <label>
          {t("login.email")}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            placeholder="nombre@empresa.com"
          />
        </label>
        <label>
          {t("login.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>
        {error && <p className="error">{t("login.error")}</p>}
        <button type="submit" disabled={enviando}>
          {t("login.submit")}
        </button>
        <div className="login-pie">
          <SelectorIdioma />
        </div>
      </form>
      <p className="login-copy">© {new Date().getFullYear()} digivend</p>
    </div>
  );
}
