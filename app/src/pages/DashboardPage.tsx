import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onSnapshot, orderBy, query } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { col } from "@/lib/db";
import { useAuth } from "@/auth/AuthContext";
import type { Expediente } from "@/types/domain";

export function DashboardPage() {
  const { t } = useTranslation();
  const { sesion } = useAuth();
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);

  useEffect(() => {
    if (!sesion) return;
    const q = query(col.expedientes(sesion.tenantId), orderBy("creadoEn", "desc"));
    return onSnapshot(q, (snap) =>
      setExpedientes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expediente)),
    );
  }, [sesion]);

  const enCurso = expedientes.filter(
    (e) => e.estado !== "completado" && e.estado !== "cancelado",
  );

  const esDireccion =
    sesion?.roles.includes("admin") || sesion?.roles.includes("direccion");
  const misTareas = enCurso.flatMap((e) =>
    e.tareas
      .filter(
        (tx) =>
          tx.estado === "pendiente" &&
          (esDireccion || sesion?.roles.includes(tx.rolResponsable)),
      )
      .map((tx) => ({ expediente: e, tarea: tx })),
  );

  return (
    <section>
      <h1>{t("dashboard.title")}</h1>
      <p>{sesion?.roles.map((rol) => t(`roles.${rol}`)).join(" · ") || "—"}</p>
      <div className="cards">
        <article className="card">
          <h2>
            {t("dashboard.misTareas")} ({misTareas.length})
          </h2>
          {misTareas.length === 0 ? (
            <p>{t("dashboard.sinTareas")}</p>
          ) : (
            <ul className="lista-tareas">
              {misTareas.slice(0, 10).map(({ expediente, tarea }) => (
                <li key={tarea.id}>
                  <Link to={`/expedientes/${expediente.id}`}>
                    {expediente.clienteNombre}
                  </Link>
                  : {t(tarea.titulo)}
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="card">
          <h2>
            {t("dashboard.expedientesEnCurso")} ({enCurso.length})
          </h2>
          <ul className="lista-tareas">
            {enCurso.slice(0, 10).map((e) => (
              <li key={e.id}>
                <Link to={`/expedientes/${e.id}`}>{e.clienteNombre}</Link>{" "}
                <span className={`badge estado-${e.estado}`}>
                  {t(`expedientes.estados.${e.estado}`)}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
