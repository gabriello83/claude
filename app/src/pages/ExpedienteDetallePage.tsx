import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { col } from "@/lib/db";
import { db } from "@/lib/firebase";
import { useAuth, tieneRol } from "@/auth/AuthContext";
import { encolarCorreo, type CorreoEncolado } from "@/lib/correos";
import {
  ORDEN_ESTADOS,
  avanzar,
  costeTotal,
  excesoInversion,
  puedeAvanzar,
} from "@/lib/workflow";
import type {
  Cliente,
  EstadoExpediente,
  Expediente,
  LineaCoste,
  MaquinaExpediente,
  ModeloMaquina,
  TipoCorreo,
} from "@/types/domain";

/** Correos disponibles en cada paso del workflow (diseño funcional §6) */
const CORREOS_POR_ESTADO: Partial<Record<EstadoExpediente, TipoCorreo[]>> = {
  registrado: ["aviso_cliente_nuevo"],
  preparacion_tecnica: [
    "preparacion_tecnica",
    "solicitud_proveedor",
    "planograma_fabricante",
    "peticion_cambio",
  ],
  alta_administrativa: ["peticion_cambio"],
  instalacion: ["orden_instalacion"],
};

export function ExpedienteDetallePage() {
  const { t, i18n } = useTranslation();
  const { sesion } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [maquinas, setMaquinas] = useState<(MaquinaExpediente & { id: string })[]>([]);
  const [modelos, setModelos] = useState<Map<string, ModeloMaquina>>(new Map());
  const [correos, setCorreos] = useState<(CorreoEncolado & { id: string })[]>([]);
  const [avisoCorreo, setAvisoCorreo] = useState<string | null>(null);

  const [invExiste, setInvExiste] = useState<"si" | "no">("no");
  const [invImporte, setInvImporte] = useState("");

  const [costeConcepto, setCosteConcepto] = useState("");
  const [costeImporte, setCosteImporte] = useState("");
  const [costeTipo, setCosteTipo] = useState<LineaCoste["tipo"]>("maquina");

  const [ruta, setRuta] = useState("");
  const [reponedor, setReponedor] = useState("");
  const [tecnicoRuta, setTecnicoRuta] = useState("");

  useEffect(() => {
    if (!sesion || !id) return;
    return onSnapshot(col.expediente(sesion.tenantId, id), (snap) => {
      if (snap.exists()) setExpediente({ id: snap.id, ...snap.data() } as Expediente);
    });
  }, [sesion, id]);

  useEffect(() => {
    if (!sesion || !expediente?.clienteId || cliente) return;
    getDoc(doc(db, "tenants", sesion.tenantId, "clientes", expediente.clienteId)).then(
      (snap) => {
        if (snap.exists()) setCliente(snap.data() as Cliente);
      },
    );
  }, [sesion, expediente?.clienteId, cliente]);

  useEffect(() => {
    if (!sesion || !id) return;
    getDocs(col.maquinas(sesion.tenantId, id)).then((snap) =>
      setMaquinas(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MaquinaExpediente & { id: string })),
    );
    getDocs(col.modelosMaquina(sesion.tenantId)).then((snap) =>
      setModelos(new Map(snap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as ModeloMaquina]))),
    );
  }, [sesion, id]);

  useEffect(() => {
    if (!sesion || !id) return;
    const q = query(collection(db, "tenants", sesion.tenantId, "mail"), where("expedienteId", "==", id));
    return onSnapshot(q, (snap) =>
      setCorreos(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as CorreoEncolado & { id: string })
          .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)),
      ),
    );
  }, [sesion, id]);

  const textoMaquinas = useMemo(
    () =>
      maquinas
        .map((m) => {
          const mod = modelos.get(m.modeloId);
          const nombre = mod ? `${mod.marca} ${mod.modelo} (${mod.codigo})` : m.modeloId;
          const detalles = [
            m.nueva ? t("nuevoExpediente.nueva") : t("nuevoExpediente.usada"),
            m.numeroSerie ? `S/N ${m.numeroSerie}` : null,
            ...m.perifericos.map((p) => t(`perifericos.${p}`)),
            m.telemetria.activa ? t("nuevoExpediente.telemetria") : null,
          ].filter(Boolean);
          return `- ${nombre}: ${detalles.join(", ")}`;
        })
        .join("\n"),
    [maquinas, modelos, t],
  );

  if (!sesion || !expediente) return <p>{t("common.loading")}</p>;

  const ref = col.expediente(sesion.tenantId, expediente.id);
  const exceso = excesoInversion(expediente);
  const moneda = new Intl.NumberFormat(i18n.language, { style: "currency", currency: "EUR" });

  const contextoBase: Record<string, string> = {
    cliente: expediente.clienteNombre,
    direccion: cliente?.direccionInstalacion ?? "",
    contacto: cliente
      ? `${cliente.contacto.nombre} ${cliente.contacto.telefono}`.trim()
      : "",
    fecha: expediente.instalacion.fechaPrevista ?? "-",
    requisitos: expediente.instalacion.requisitosUbicacion ?? "-",
    maquinas: textoMaquinas || "-",
    canon:
      t(`canon.${expediente.canon.tipo}`) +
      (expediente.canon.importeFijo ? ` ${moneda.format(expediente.canon.importeFijo)}` : "") +
      (expediente.canon.porcentajeVariable ? ` ${expediente.canon.porcentajeVariable}%` : ""),
  };

  const enviarCorreo = async (tipo: TipoCorreo, extra: Record<string, string> = {}) => {
    setAvisoCorreo(null);
    const res = await encolarCorreo({
      tenantId: sesion.tenantId,
      tipo,
      contexto: { ...contextoBase, ...extra },
      expedienteId: expediente.id,
      creadoPor: sesion.user.email ?? "",
    });
    if (!res.ok) setAvisoCorreo(t("correos.faltanDirecciones"));
    return res.ok;
  };

  const enviarPeticionCambio = async () => {
    const importe = window.prompt(t("detalle.importe"), "200");
    if (importe === null) return;
    await enviarCorreo("peticion_cambio", { importe: moneda.format(Number(importe) || 0) });
  };

  const enviarAltaRuta = async () => {
    const ok = await enviarCorreo("alta_ruta", {
      ruta,
      reponedor,
      tecnico: tecnicoRuta,
    });
    if (ok) {
      // El envío del correo de ruta cierra el workflow (D23)
      await updateDoc(ref, {
        ruta: { ruta, reponedor, tecnico: tecnicoRuta },
        estado: "completado",
        tareas: expediente.tareas.map((tx) =>
          tx.paso === "alta_en_ruta" && tx.titulo === "tareas.enviarAltaRuta"
            ? { ...tx, estado: "hecha" }
            : tx,
        ),
      });
    }
  };

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

  const correosDisponibles = CORREOS_POR_ESTADO[expediente.estado] ?? [];

  return (
    <section>
      <div className="titulo-con-accion">
        <h1>{expediente.clienteNombre}</h1>
        <span className={`badge estado-${expediente.estado}`}>
          {t(`expedientes.estados.${expediente.estado}`)}
        </span>
      </div>

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
      {avisoCorreo && <div className="alerta">{avisoCorreo}</div>}

      {puedeAvanzar(expediente, sesion.roles) && expediente.estado !== "alta_en_ruta" && (
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
          <h2>{t("correos.title")}</h2>
          <div className="form-inline">
            {correosDisponibles.map((tipo) =>
              tipo === "peticion_cambio" ? (
                <button key={tipo} className="secundario" onClick={() => void enviarPeticionCambio()}>
                  ✉ {t(`correos.tipos.${tipo}`)}
                </button>
              ) : (
                <button key={tipo} className="secundario" onClick={() => void enviarCorreo(tipo)}>
                  ✉ {t(`correos.tipos.${tipo}`)}
                </button>
              ),
            )}
          </div>

          {expediente.estado === "alta_en_ruta" && (
            <div className="form-inline alta-ruta">
              <label>
                {t("correos.ruta")}
                <input value={ruta} onChange={(e) => setRuta(e.target.value)} />
              </label>
              <label>
                {t("correos.reponedor")}
                <input value={reponedor} onChange={(e) => setReponedor(e.target.value)} />
              </label>
              <label>
                {t("correos.tecnico")}
                <input value={tecnicoRuta} onChange={(e) => setTecnicoRuta(e.target.value)} />
              </label>
              <button
                disabled={!ruta || !reponedor || !tecnicoRuta}
                onClick={() => void enviarAltaRuta()}
              >
                ✉ {t("correos.tipos.alta_ruta")}
              </button>
            </div>
          )}

          <h3>{t("correos.enviados")}</h3>
          {correos.length === 0 ? (
            <p className="ayuda">{t("correos.sinCorreos")}</p>
          ) : (
            <ul className="lista-tareas">
              {correos.map((c) => (
                <li key={c.id}>
                  <span className={`badge correo-${c.estado}`}>
                    {t(`correos.estado_${c.estado}`)}
                  </span>{" "}
                  {t(`correos.tipos.${c.tipo}`)} — {c.asunto}
                  <span className="rol">
                    {new Date(c.creadoEn).toLocaleString()} · {c.para.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
          <p>{contextoBase.canon}</p>
          <ul>
            {expediente.condicionesEspeciales.map((c, i) => (
              <li key={i}>
                {t(`condiciones.${c.tipo}`)}
                {c.descripcion ? ` — ${c.descripcion}` : ""}
              </li>
            ))}
          </ul>
          {expediente.ruta && (
            <p className="ayuda">
              {t("correos.ruta")}: {expediente.ruta.ruta} · {t("correos.reponedor")}:{" "}
              {expediente.ruta.reponedor} · {t("correos.tecnico")}: {expediente.ruta.tecnico}
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
