import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthContext";

export function DashboardPage() {
  const { t } = useTranslation();
  const { sesion } = useAuth();

  return (
    <section>
      <h1>{t("dashboard.title")}</h1>
      <p>
        {sesion?.roles.map((rol) => t(`roles.${rol}`)).join(" · ") || "—"}
      </p>
      <div className="cards">
        <article className="card">
          <h2>{t("dashboard.misTareas")}</h2>
          <p>{t("dashboard.sinTareas")}</p>
        </article>
        <article className="card">
          <h2>{t("dashboard.expedientesEnCurso")}</h2>
          <p>—</p>
        </article>
      </div>
    </section>
  );
}
