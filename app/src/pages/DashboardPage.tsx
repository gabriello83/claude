import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { col } from "@/lib/db";
import { useAuth, veTodasDelegaciones } from "@/auth/AuthContext";
import { FLUJOS, costeTotal, excesoInversion } from "@/lib/workflow";
import type { EstadoExpediente, Expediente } from "@/types/domain";

const DIAS_ATASCADO = 14;

const diasDesde = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { sesion } = useAuth();
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);

  useEffect(() => {
    if (!sesion) return;
    const base = col.expedientes(sesion.tenantId);
    const q = veTodasDelegaciones(sesion)
      ? query(base, orderBy("creadoEn", "desc"))
      : query(base, where("delegacionId", "==", sesion.delegacionId), orderBy("creadoEn", "desc"));
    return onSnapshot(q, (snap) =>
      setExpedientes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expediente)),
    );
  }, [sesion]);

  if (!sesion) return null;

  const moneda = new Intl.NumberFormat(i18n.language, { style: "currency", currency: "EUR" });

  const enCurso = expedientes.filter(
    (e) => e.estado !== "completado" && e.estado !== "cancelado",
  );
  const completados30 = expedientes.filter(
    (e) => e.estado === "completado" && diasDesde(e.creadoEn) <= 30,
  );
  const conExceso = enCurso.filter((e) => excesoInversion(e) !== null);
  const atascados = enCurso.filter((e) => diasDesde(e.creadoEn) > DIAS_ATASCADO);

  const esDireccion = veTodasDelegaciones(sesion);
  const misTareas = enCurso.flatMap((e) =>
    e.tareas
      .filter(
        (tx) =>
          tx.estado === "pendiente" &&
          (esDireccion || sesion.roles.includes(tx.rolResponsable)),
      )
      .map((tx) => ({ expediente: e, tarea: tx })),
  );

  // Cuellos de botella: expedientes en curso por estado, en el orden del flujo
  const estadosOrdenados = FLUJOS.instalacion.filter(
    (s) => s !== "completado",
  ) as EstadoExpediente[];
  if (!estadosOrdenados.includes("ejecucion")) estadosOrdenados.push("ejecucion");
  const porEstado = estadosOrdenados
    .map((estado) => ({ estado, n: enCurso.filter((e) => e.estado === estado).length }))
    .filter((x) => x.n > 0);

  return (
    <section>
      <h1>{t("dashboard.title")}</h1>
      <p className="ayuda">
        {sesion.roles.map((rol) => t(`roles.${rol}`)).join(" · ")}
      </p>

      {/* KPIs */}
      <div className="kpis">
        <Link to="/expedientes" className="kpi">
          <span className="kpi-valor">{enCurso.length}</span>
          <span className="kpi-nombre">{t("dashboard.enCurso")}</span>
        </Link>
        <div className="kpi">
          <span className="kpi-valor">{misTareas.length}</span>
          <span className="kpi-nombre">{t("dashboard.misTareas")}</span>
        </div>
        <div className={`kpi ${conExceso.length ? "kpi-alerta" : ""}`}>
          <span className="kpi-valor">{conExceso.length}</span>
          <span className="kpi-nombre">{t("dashboard.excesos")}</span>
        </div>
        <div className={`kpi ${atascados.length ? "kpi-aviso" : ""}`}>
          <span className="kpi-valor">{atascados.length}</span>
          <span className="kpi-nombre">{t("dashboard.atascados", { dias: DIAS_ATASCADO })}</span>
        </div>
        <div className="kpi">
          <span className="kpi-valor">{completados30.length}</span>
          <span className="kpi-nombre">{t("dashboard.completados30")}</span>
        </div>
      </div>

      {/* Cuellos de botella por paso del workflow */}
      {porEstado.length > 0 && (
        <div className="pasos" style={{ marginTop: "0.4rem" }}>
          {porEstado.map(({ estado, n }) => (
            <li key={estado} className={`badge estado-${estado}`} style={{ listStyle: "none" }}>
              {t(`expedientes.estados.${estado}`)}: <strong>{n}</strong>
            </li>
          ))}
        </div>
      )}

      {/* Avisos de exceso de inversión (D25) */}
      {conExceso.map((e) => (
        <div className="alerta" key={e.id}>
          <Link to={`/expedientes/${e.id}`}>{e.clienteNombre}</Link>:{" "}
          {t("detalle.excesoInversion", { exceso: moneda.format(excesoInversion(e) ?? 0) })}{" "}
          ({t("dashboard.coste")}: {moneda.format(costeTotal(e))})
        </div>
      ))}

      <div className="cards">
        <article className="card">
          <h2>
            {t("dashboard.misTareas")} ({misTareas.length})
          </h2>
          {misTareas.length === 0 ? (
            <p>{t("dashboard.sinTareas")}</p>
          ) : (
            <ul className="lista-tareas">
              {misTareas.slice(0, 12).map(({ expediente, tarea }) => (
                <li key={tarea.id}>
                  <Link to={`/expedientes/${expediente.id}`}>{expediente.clienteNombre}</Link>
                  : {t(tarea.titulo)}
                  <span className="rol">
                    {t(`expedientes.estados.${expediente.estado}`)}
                    {expediente.delegacionNombre ? ` · ${expediente.delegacionNombre}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card">
          <h2>
            {t("dashboard.expedientesEnCurso")} ({enCurso.length})
          </h2>
          {enCurso.length === 0 ? (
            <p>—</p>
          ) : (
            <div className="tabla-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("expedientes.cliente")}</th>
                    <th>{t("nuevoExpediente.delegacion")}</th>
                    <th>{t("expedientes.tipo")}</th>
                    <th>{t("expedientes.estado")}</th>
                    <th>{t("dashboard.dias")}</th>
                    <th>{t("expedientes.tareasPendientes")}</th>
                  </tr>
                </thead>
                <tbody>
                  {enCurso.slice(0, 15).map((e) => {
                    const dias = diasDesde(e.creadoEn);
                    return (
                      <tr key={e.id}>
                        <td>
                          <Link to={`/expedientes/${e.id}`}>{e.clienteNombre}</Link>
                        </td>
                        <td>{e.delegacionNombre || "—"}</td>
                        <td>{t(`expedientes.tipos.${e.tipo}`)}</td>
                        <td>
                          <span className={`badge estado-${e.estado}`}>
                            {t(`expedientes.estados.${e.estado}`)}
                          </span>
                        </td>
                        <td className={dias > DIAS_ATASCADO ? "dias-atascado" : ""}>{dias}</td>
                        <td>{e.tareas.filter((x) => x.estado === "pendiente").length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
