import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthContext";
import { SelectorIdioma } from "./SelectorIdioma";

export function Layout() {
  const { t } = useTranslation();
  const { sesion, logout } = useAuth();

  return (
    <div className="layout">
      <header className="topbar">
        <span className="brand">{t("app.name")}</span>
        <nav>
          <NavLink to="/">{t("nav.dashboard")}</NavLink>
          <NavLink to="/expedientes">{t("nav.expedientes")}</NavLink>
          <NavLink to="/tarifas">{t("nav.tarifas")}</NavLink>
          <NavLink to="/catalogo">{t("nav.catalogo")}</NavLink>
          {sesion?.roles.includes("admin") && (
            <NavLink to="/configuracion">{t("nav.configuracion")}</NavLink>
          )}
        </nav>
        <div className="topbar-right">
          <SelectorIdioma />
          <span className="user-email">{sesion?.user.email}</span>
          <button onClick={() => void logout()}>{t("nav.logout")}</button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
