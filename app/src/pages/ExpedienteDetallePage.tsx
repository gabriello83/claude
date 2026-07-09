import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { onSnapshot, updateDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { col } from "@/lib/db";
import { useAuth, tieneRol } from "@/auth/AuthContext";
import {
  ORDEN_ESTADOS,
  avanzar,
  costeTotal,
  excesoInversion,
  puedeAvanzar,
} from "@/lib/workflow";
import type { Expediente, LineaCoste } from "@/types/domain";

export function ExpedienteDetallePage() {
  const { t, i18n } = useTranslation();
  const { sesion } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [expediente, setExpediente] = useState<Expediente | null>(null);

  // Formulario propuesta de inversión (administración, D25)
  const [invExiste, setInvExiste] = useState<"si" | "no">("no");
  const [invImporte, setInvImporte] = useState("");

  // Nueva línea de coste
  const [costeConcepto, setCosteConcepto] = useState("");
  const [costeImporte, setCosteImporte] = useState("");
  const [costeTipo, setCosteTipo] = useState<LineaCoste["tipo"]>("maquina");

  useEffect(() => {
    if (!sesion || !id) return;
    return onSnapshot(col.expediente(sesion.tenantId, id), (snap) => {
      if (snap.exists()) setExpediente({ id: snap.id, ...snap.data() } as Expediente);
    });
  }, [sesion, id]);

  if (!sesion || !expediente) return <p>{t("common.loading")}</p>;

  const ref = col.expediente(sesion.tenantId, expediente.id);
  const exceso = excesoInversion(expediente);
  const moneda = new Intl.NumberFormat(i18n.language, { style: "currency", currency: "EUR" });

  const marcarTarea = (tareaId: string, hecha: boolean) =>
    updateDoc(ref, {
      tareas: expediente.tareas.map((tx) =>
        tx.id === tareaId ? { ...tx, estado: hecha ? "hecha" : "pendiente" } : tx,
      ),
    });

  const onAvanzar = () => {
    const cambio = avanzar(expediente);
    if (cambio) void updateDoc(ref, cambio);
  };

  const guardarInversion = () =>
    updateDoc(ref, {
      propuestaInversion: {
        existe: invExiste === "si",
        ...(invExiste === "si" && invImporte ? { importe: Number(invImporte) } : {}),
        respondidoPor: sesion.user.email ?? "",
      },
    });

  const addLineaCoste = () => {
    if (!costeConcepto || !costeImporte) return;
    void updateDoc(ref, {
      lineasCoste: [
        ...expediente.lineasCoste,
        { tipo: costeTipo, concepto: costeConcepto, importe: Number(costeImporte) },
      ],
    });
    setCosteConcepto("");
    setCosteImporte("");
  };

  const misTareas = expediente.tareas.filter(
    (tx) =>
      tx.estado === "pendiente" &&
      (sesion.roles.includes(tx.rolResponsable) ||
        sesion.roles.includes("admin") ||
        sesion.roles.includes("direccion")),
  );

  return (
    <section>
      <div className="titulo-con-accion">
        <h1>{expediente.clienteNombre}</h1>
        <span className={`badge estado-${expediente.estado}`}>
          {t(`expedientes.estados.${expediente.estado}`)}
        </span>
      </div>

      {/* Barra de progreso del workflow */}
      <ol className="pasos">
        {ORDEN_ESTADOS.map((paso) => (
          <li
            key={paso}
            className={
              ORDEN_ESTADOS.indexOf(paso) < ORDEN_ESTADOS.indexOf(expediente.estado)
                ? "hecho"
                : paso === expediente.estado
                  ? "actual"
                  : ""
            }
          >
            {t(`expedientes.estados.${paso}`)}
          </li>
        ))}
      </ol>

      {exceso !== null && (
        <div className="alerta">
          {t("detalle.excesoInversion", { exceso: moneda.format(exceso) })}
        </div>
      )}

      {puedeAvanzar(expediente, sesion.roles) &&
        expediente.estado !== "completado" &&
        expediente.estado !== "cancelado" && (
          <button onClick={onAvanzar}>{t("detalle.avanzar")}</button>
        )}

      <div className="cards">
        <article className="card">
          <h2>{t("detalle.tareas")}</h2>
          {expediente.tareas.length === 0 && <p>—</p>}
          <ul className="lista-tareas">
            {expediente.tareas.map((tx) => (
              <li key={tx.id} className={tx.estado === "hecha" ? "hecha" : ""}>
                <label>
                  <input
                    type="checkbox"
                    checked={tx.estado === "hecha"}
                    disabled={!misTareas.some((m) => m.id === tx.id) && tx.estado !== "hecha"}
                    onChange={(e) => void marcarTarea(tx.id, e.target.checked)}
                  />
                  {t(tx.titulo)}
                  <span className="rol">{t(`roles.${tx.rolResponsable}`)}</span>
                </label>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>{t("detalle.inversion")}</h2>
          {expediente.propuestaInversion ? (
            <p>
              {expediente.propuestaInversion.existe
                ? t("detalle.inversionImporte", {
                    importe: moneda.format(expediente.propuestaInversion.importe ?? 0),
                  })
                : t("detalle.sinInversion")}
            </p>
          ) : tieneRol(sesion, "administracion") ? (
            <div className="form-inline">
              <label>
                {t("detalle.hayInversion")}
                <select value={invExiste} onChange={(e) => setInvExiste(e.target.value as "si" | "no")}>
                  <option value="no">{t("common.no")}</option>
                  <option value="si">{t("common.si")}</option>
                </select>
              </label>
              {invExiste === "si" && (
                <label>
                  {t("detalle.importe")}
                  <input type="number" step="0.01" value={invImporte} onChange={(e) => setInvImporte(e.target.value)} />
                </label>
              )}
              <button onClick={() => void guardarInversion()}>{t("common.save")}</button>
            </div>
          ) : (
            <p>{t("detalle.inversionPendiente")}</p>
          )}
        </article>

        <article className="card">
          <h2>
            {t("detalle.costes")} — {moneda.format(costeTotal(expediente))}
          </h2>
          <ul>
            {expediente.lineasCoste.map((l, i) => (
              <li key={i}>
                {t(`costes.${l.tipo}`)}: {l.concepto} — {moneda.format(l.importe)}
              </li>
            ))}
          </ul>
          <div className="form-inline">
            <select value={costeTipo} onChange={(e) => setCosteTipo(e.target.value as LineaCoste["tipo"])}>
              {(["maquina", "periferico", "equipamiento", "instalacion"] as const).map((tp) => (
                <option key={tp} value={tp}>
                  {t(`costes.${tp}`)}
                </option>
              ))}
            </select>
            <input
              placeholder={t("detalle.concepto")}
              value={costeConcepto}
              onChange={(e) => setCosteConcepto(e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              placeholder="€"
              value={costeImporte}
              onChange={(e) => setCosteImporte(e.target.value)}
            />
            <button onClick={addLineaCoste}>+</button>
          </div>
        </article>

        <article className="card">
          <h2>{t("detalle.condiciones")}</h2>
          <p>
            {t(`canon.${expediente.canon.tipo}`)}
            {expediente.canon.importeFijo ? ` · ${moneda.format(expediente.canon.importeFijo)}` : ""}
            {expediente.canon.porcentajeVariable ? ` · ${expediente.canon.porcentajeVariable}%` : ""}
          </p>
          <ul>
            {expediente.condicionesEspeciales.map((c, i) => (
              <li key={i}>
                {t(`condiciones.${c.tipo}`)}
                {c.descripcion ? ` — ${c.descripcion}` : ""}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
