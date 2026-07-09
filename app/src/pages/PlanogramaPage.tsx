import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addDoc, collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { db } from "@/lib/firebase";
import { col } from "@/lib/db";
import { useAuth } from "@/auth/AuthContext";
import {
  esMaquinaDeCafe,
  imprimirHojaTaller,
  imprimirPlanogramaFabrica,
  mapaPosiciones,
  posicionKey,
} from "@/lib/planograma";
import type {
  Expediente,
  MaquinaExpediente,
  ModeloMaquina,
  PlantillaPlanograma,
  PosicionPlanograma,
  Producto,
  SeleccionPlanograma,
  TipoEspiral,
} from "@/types/domain";

export function PlanogramaPage() {
  const { t, i18n } = useTranslation();
  const { sesion } = useAuth();
  const { id: expedienteId, maquinaId } = useParams<{ id: string; maquinaId: string }>();

  const [licencia, setLicencia] = useState<boolean | null>(null);
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [maquina, setMaquina] = useState<MaquinaExpediente | null>(null);
  const [modelo, setModelo] = useState<ModeloMaquina | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [plantillas, setPlantillas] = useState<PlantillaPlanograma[]>([]);

  const [posiciones, setPosiciones] = useState<PosicionPlanograma[]>([]);
  const [selecciones, setSelecciones] = useState<SeleccionPlanograma[]>([]);
  const [celda, setCelda] = useState<{ bandeja: number; espiral: number } | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [guardadoOk, setGuardadoOk] = useState(false);

  useEffect(() => {
    if (!sesion || !expedienteId || !maquinaId) return;
    const t0 = sesion.tenantId;

    getDoc(doc(db, "tenants", t0)).then((snap) => {
      const modulos = snap.data()?.modulos as { planograma?: boolean } | undefined;
      setLicencia(modulos?.planograma !== false);
    });
    getDoc(col.expediente(t0, expedienteId)).then(
      (s) => s.exists() && setExpediente({ id: s.id, ...s.data() } as Expediente),
    );
    getDoc(doc(db, "tenants", t0, "expedientes", expedienteId, "maquinas", maquinaId)).then(
      async (s) => {
        if (!s.exists()) return;
        const m = { id: s.id, ...s.data() } as MaquinaExpediente;
        setMaquina(m);
        const mod = await getDoc(doc(db, "tenants", t0, "modelosMaquina", m.modeloId));
        if (mod.exists()) setModelo({ id: mod.id, ...mod.data() } as ModeloMaquina);
      },
    );
    getDocs(col.productos(t0)).then((snap) =>
      setProductos(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Producto)),
    );
    getDoc(
      doc(db, "tenants", t0, "expedientes", expedienteId, "planogramas", maquinaId),
    ).then((s) => {
      if (s.exists()) {
        const p = s.data();
        setPosiciones((p.posiciones as PosicionPlanograma[]) ?? []);
        setSelecciones((p.selecciones as SeleccionPlanograma[]) ?? []);
      }
    });
  }, [sesion, expedienteId, maquinaId]);

  useEffect(() => {
    if (!sesion || !modelo) return;
    getDocs(collection(db, "tenants", sesion.tenantId, "plantillasPlanograma")).then((snap) =>
      setPlantillas(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as PlantillaPlanograma)
          .filter((p) => p.modeloId === modelo.id),
      ),
    );
  }, [sesion, modelo]);

  const mapa = useMemo(() => mapaPosiciones(posiciones), [posiciones]);
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return productos
      .filter((p) => !p.obsoleto && `${p.codigo} ${p.nombre}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [productos, busqueda]);

  if (!sesion || licencia === null || !expediente || !maquina || !modelo) {
    return <p>{t("common.loading")}</p>;
  }

  if (!licencia) {
    return (
      <section>
        <h1>{t("planograma.title")}</h1>
        <div className="alerta">{t("planograma.sinLicencia")}</div>
      </section>
    );
  }

  const esCafe = esMaquinaDeCafe(modelo);
  const moneda = new Intl.NumberFormat(i18n.language, { style: "currency", currency: "EUR" });
  const nombreProducto = (codigo: string) =>
    productos.find((p) => p.codigo === codigo)?.nombre ?? "";

  const actualizarPosicion = (patch: Partial<PosicionPlanograma>) => {
    if (!celda) return;
    setPosiciones((prev) => {
      const key = posicionKey(celda.bandeja, celda.espiral);
      const existe = prev.find((p) => posicionKey(p.bandeja, p.espiral) === key);
      if (existe) {
        return prev.map((p) =>
          posicionKey(p.bandeja, p.espiral) === key ? { ...p, ...patch } : p,
        );
      }
      return [
        ...prev,
        { bandeja: celda.bandeja, espiral: celda.espiral, tipoEspiral: "simple", ...patch },
      ];
    });
  };

  const vaciarPosicion = () => {
    if (!celda) return;
    setPosiciones((prev) =>
      prev.filter((p) => posicionKey(p.bandeja, p.espiral) !== posicionKey(celda.bandeja, celda.espiral)),
    );
  };

  const guardar = async () => {
    await setDoc(
      doc(db, "tenants", sesion.tenantId, "expedientes", expedienteId!, "planogramas", maquinaId!),
      { maquinaId, modeloId: modelo.id, posiciones, selecciones },
    );
    setGuardadoOk(true);
    setTimeout(() => setGuardadoOk(false), 2000);
  };

  const guardarPlantilla = async () => {
    const nombre = window.prompt(t("planograma.nombrePlantilla"));
    if (!nombre) return;
    const tipoCliente = window.prompt(t("planograma.tipoCliente")) ?? "";
    await addDoc(collection(db, "tenants", sesion.tenantId, "plantillasPlanograma"), {
      nombre,
      modeloId: modelo.id,
      ...(tipoCliente ? { tipoCliente } : {}),
      posiciones,
      selecciones,
    });
  };

  const cargarPlantilla = (plantillaId: string) => {
    const p = plantillas.find((x) => x.id === plantillaId);
    if (!p) return;
    setPosiciones(p.posiciones);
    setSelecciones(p.selecciones);
  };

  const etiquetasImpresion = (): Record<string, string> => ({
    hojaTaller: t("planograma.hojaTaller"),
    planogramaFabrica: t("planograma.planogramaFabrica"),
    posiciones: t("planograma.posiciones"),
    bandeja: t("planograma.bandeja"),
    espiral: t("planograma.espiral"),
    tipoEspiral: t("planograma.tipoEspiral"),
    producto: t("planograma.producto"),
    capacidad: t("planograma.capacidad"),
    precio: t("planograma.precio"),
    selecciones: t("planograma.selecciones"),
    nombre: t("tarifas.nombre"),
    perifericos: t("nuevoExpediente.perifericos"),
    telemetria: t("nuevoExpediente.telemetria"),
    condiciones: t("nuevoExpediente.condiciones"),
    hueco: t("planograma.hueco"),
    espiral_simple: t("planograma.espiral_simple"),
    espiral_doble: t("planograma.espiral_doble"),
    espiral_triple: t("planograma.espiral_triple"),
    ...Object.fromEntries(
      (["monedero", "lector_tarjeta", "billetero", "llave_privada", "app_pago"] as const).map(
        (p) => [`perif_${p}`, t(`perifericos.${p}`)],
      ),
    ),
    ...Object.fromEntries(
      (
        ["cafe_facturado", "combo", "gratuidad_diaria", "dia_gratis_anual", "lote_navidad", "otro"] as const
      ).map((c) => [`cond_${c}`, t(`condiciones.${c}`)]),
    ),
  });

  const datosImpresion = () => ({
    clienteNombre: expediente.clienteNombre,
    modelo,
    maquina,
    planograma: { id: maquinaId!, maquinaId: maquinaId!, modeloId: modelo.id, posiciones, selecciones },
    condiciones: expediente.condicionesEspeciales,
    et: etiquetasImpresion(),
    nombreProducto,
    moneda: (n: number) => moneda.format(n),
  });

  const posicionActual = celda ? mapa.get(posicionKey(celda.bandeja, celda.espiral)) : undefined;

  return (
    <section>
      <div className="titulo-con-accion">
        <h1>{t("planograma.title")}</h1>
        <span className="ayuda">
          <Link to={`/expedientes/${expedienteId}`}>{expediente.clienteNombre}</Link> ·{" "}
          {modelo.marca} {modelo.modelo} ({modelo.codigo})
        </span>
      </div>

      <div className="form-inline" style={{ marginBottom: "0.8rem" }}>
        <button onClick={() => void guardar()}>{t("common.save")}</button>
        <button className="secundario" onClick={() => void guardarPlantilla()}>
          {t("planograma.guardarPlantilla")}
        </button>
        {plantillas.length > 0 && (
          <select defaultValue="" onChange={(e) => cargarPlantilla(e.target.value)}>
            <option value="" disabled>
              {t("planograma.cargarPlantilla")}
            </option>
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
                {p.tipoCliente ? ` (${p.tipoCliente})` : ""}
              </option>
            ))}
          </select>
        )}
        <button className="secundario" onClick={() => imprimirHojaTaller(datosImpresion())}>
          🖨 {t("planograma.hojaTaller")}
        </button>
        {!esCafe && (
          <button className="secundario" onClick={() => imprimirPlanogramaFabrica(datosImpresion())}>
            🖨 {t("planograma.planogramaFabrica")}
          </button>
        )}
        {guardadoOk && <span className="ok" style={{ margin: 0 }}>{t("config.guardado")}</span>}
      </div>

      {esCafe ? (
        <div className="card">
          <h2>
            {t("planograma.selecciones")} ({modelo.canales})
          </h2>
          {Array.from({ length: modelo.canales }, (_, i) => i + 1).map((n) => {
            const sel = selecciones.find((s) => s.numero === n);
            return (
              <div className="fila" key={n}>
                <span className="tipo-correo">☕ {n}</span>
                <label className="crece">
                  {t("tarifas.nombre")}
                  <input
                    value={sel?.nombre ?? ""}
                    onChange={(e) =>
                      setSelecciones((prev) => {
                        const otras = prev.filter((s) => s.numero !== n);
                        return [...otras, { numero: n, nombre: e.target.value, precio: sel?.precio ?? 0 }];
                      })
                    }
                  />
                </label>
                <label>
                  {t("planograma.precio")}
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sel?.precio ?? ""}
                    onChange={(e) =>
                      setSelecciones((prev) => {
                        const otras = prev.filter((s) => s.numero !== n);
                        return [
                          ...otras,
                          { numero: n, nombre: sel?.nombre ?? "", precio: Number(e.target.value) },
                        ];
                      })
                    }
                  />
                </label>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="planograma-layout">
          <div className="tabla-scroll">
            <table className="rejilla">
              <tbody>
                {Array.from({ length: modelo.filas }, (_, f) => f + 1).map((bandeja) => (
                  <tr key={bandeja}>
                    <th>{t("planograma.bandeja")} {bandeja}</th>
                    {Array.from({ length: modelo.columnas }, (_, c) => c + 1).map((espiral) => {
                      const pos = mapa.get(posicionKey(bandeja, espiral));
                      const activa = celda?.bandeja === bandeja && celda?.espiral === espiral;
                      return (
                        <td
                          key={espiral}
                          className={`celda ${pos?.productoId ? "ocupada" : ""} ${activa ? "activa" : ""}`}
                          onClick={() => {
                            setCelda({ bandeja, espiral });
                            setBusqueda("");
                          }}
                        >
                          <div className="celda-num">{espiral}</div>
                          {pos?.productoId && (
                            <div className="celda-prod" title={nombreProducto(pos.productoId)}>
                              {pos.productoId}
                              {pos.precio !== undefined && <div>{moneda.format(pos.precio)}</div>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {celda && (
            <aside className="card editor-celda">
              <h2>
                {t("planograma.bandeja")} {celda.bandeja} · {t("planograma.espiral")} {celda.espiral}
              </h2>
              {posicionActual?.productoId && (
                <p>
                  <strong>{posicionActual.productoId}</strong> —{" "}
                  {nombreProducto(posicionActual.productoId)}
                </p>
              )}
              <label>
                {t("planograma.buscarProducto")}
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </label>
              {productosFiltrados.length > 0 && (
                <ul className="lista-tareas resultados">
                  {productosFiltrados.map((p) => (
                    <li key={p.id}>
                      <button
                        className="secundario"
                        onClick={() => {
                          actualizarPosicion({ productoId: p.codigo });
                          setBusqueda("");
                        }}
                      >
                        {p.codigo} — {p.nombre}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="fila">
                <label>
                  {t("planograma.tipoEspiral")}
                  <select
                    value={posicionActual?.tipoEspiral ?? "simple"}
                    onChange={(e) => actualizarPosicion({ tipoEspiral: e.target.value as TipoEspiral })}
                  >
                    {(["simple", "doble", "triple"] as const).map((tp) => (
                      <option key={tp} value={tp}>
                        {t(`planograma.espiral_${tp}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("planograma.capacidad")}
                  <input
                    type="number"
                    min="0"
                    value={posicionActual?.capacidad ?? ""}
                    onChange={(e) => actualizarPosicion({ capacidad: Number(e.target.value) })}
                  />
                </label>
                <label>
                  {t("planograma.precio")}
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={posicionActual?.precio ?? ""}
                    onChange={(e) => actualizarPosicion({ precio: Number(e.target.value) })}
                  />
                </label>
              </div>
              <button className="secundario" onClick={vaciarPosicion}>
                {t("planograma.vaciar")}
              </button>
            </aside>
          )}
        </div>
      )}
    </section>
  );
}
