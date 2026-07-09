import { useEffect, useRef, useState } from "react";
import { addDoc, collection, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { db } from "@/lib/firebase";
import { col } from "@/lib/db";
import { useAuth } from "@/auth/AuthContext";
import {
  aplicarRevision,
  generarPlantilla,
  importarExcel,
  type ModoRevision,
  type ResultadoImport,
} from "@/lib/tarifas";
import type { Tarifa } from "@/types/domain";

export function TarifasPage() {
  const { t, i18n } = useTranslation();
  const { sesion } = useAuth();
  const [tarifas, setTarifas] = useState<Tarifa[] | null>(null);
  const [seleccionada, setSeleccionada] = useState<Tarifa | null>(null);

  // Import
  const inputFichero = useRef<HTMLInputElement>(null);
  const [nombreNueva, setNombreNueva] = useState("");
  const [resultado, setResultado] = useState<ResultadoImport | null>(null);
  const [importando, setImportando] = useState(false);

  // Revisión IPC
  const [modo, setModo] = useState<ModoRevision>("porcentaje");
  const [valor, setValor] = useState("");
  const [desde, setDesde] = useState("");

  useEffect(() => {
    if (!sesion) return;
    const q = query(collection(db, "tenants", sesion.tenantId, "tarifas"), orderBy("creadoEn", "desc"));
    return onSnapshot(q, (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tarifa);
      setTarifas(lista);
      setSeleccionada((s) => (s ? (lista.find((x) => x.id === s.id) ?? null) : null));
    });
  }, [sesion]);

  if (!sesion) return null;

  const moneda = new Intl.NumberFormat(i18n.language, { style: "currency", currency: "EUR" });

  const descargarPlantilla = () => {
    const url = URL.createObjectURL(generarPlantilla());
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_tarifas_digivend.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFichero = async (file: File) => {
    setImportando(true);
    setResultado(null);
    try {
      const catalogoSnap = await getDocs(col.productos(sesion.tenantId));
      const catalogo = new Map(
        catalogoSnap.docs.map((d) => [d.id, (d.data().nombre as string) ?? ""]),
      );
      setResultado(await importarExcel(file, catalogo));
    } finally {
      setImportando(false);
    }
  };

  const confirmarImport = async () => {
    if (!resultado || resultado.errores.length > 0 || !nombreNueva) return;
    await addDoc(collection(db, "tenants", sesion.tenantId, "tarifas"), {
      nombre: nombreNueva,
      vigenteDesde: new Date().toISOString().slice(0, 10),
      lineas: resultado.lineas,
      combos: resultado.combos,
      condiciones: resultado.condiciones,
      creadoEn: new Date().toISOString(),
    });
    setResultado(null);
    setNombreNueva("");
    if (inputFichero.current) inputFichero.current.value = "";
  };

  const crearRevision = async () => {
    if (!seleccionada || !valor || !desde) return;
    await addDoc(
      collection(db, "tenants", sesion.tenantId, "tarifas"),
      aplicarRevision(seleccionada, modo, Number(valor), desde),
    );
    setValor("");
  };

  return (
    <section>
      <div className="titulo-con-accion">
        <h1>{t("tarifas.title")}</h1>
        <button className="secundario" onClick={descargarPlantilla}>
          ⬇ {t("tarifas.descargarPlantilla")}
        </button>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2>{t("tarifas.importar")}</h2>
        <div className="form-inline">
          <label>
            {t("tarifas.nombre")}
            <input value={nombreNueva} onChange={(e) => setNombreNueva(e.target.value)} />
          </label>
          <input
            ref={inputFichero}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && void onFichero(e.target.files[0])}
          />
        </div>
        {importando && <p>{t("common.loading")}</p>}
        {resultado && (
          <div>
            {resultado.errores.length > 0 && (
              <div className="alerta">
                <strong>{t("tarifas.errores")}:</strong>
                <ul>
                  {resultado.errores.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {resultado.avisos.length > 0 && (
              <div className="aviso-suave">
                <strong>{t("tarifas.avisos")}:</strong>
                <ul>
                  {resultado.avisos.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            {resultado.errores.length === 0 && (
              <p>
                {t("tarifas.resumenImport", {
                  lineas: resultado.lineas.length,
                  combos: resultado.combos.length,
                  condiciones: resultado.condiciones.length,
                })}{" "}
                <button disabled={!nombreNueva} onClick={() => void confirmarImport()}>
                  {t("tarifas.confirmar")}
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      {tarifas === null ? (
        <p>{t("common.loading")}</p>
      ) : tarifas.length === 0 ? (
        <p>{t("tarifas.sinTarifas")}</p>
      ) : (
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("tarifas.nombre")}</th>
                <th>{t("tarifas.vigenteDesde")}</th>
                <th>{t("tarifas.lineas")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tarifas.map((tf) => (
                <tr key={tf.id}>
                  <td>{tf.nombre}</td>
                  <td>{tf.vigenteDesde}</td>
                  <td>{tf.lineas.length}</td>
                  <td>
                    <button className="secundario" onClick={() => setSeleccionada(tf)}>
                      {t("tarifas.ver")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {seleccionada && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h2>{seleccionada.nombre}</h2>
          <div className="form-inline alta-ruta">
            <strong>{t("tarifas.revision")}</strong>
            <select value={modo} onChange={(e) => setModo(e.target.value as ModoRevision)}>
              <option value="porcentaje">{t("tarifas.subidaPct")}</option>
              <option value="fijo">{t("tarifas.subidaFija")}</option>
            </select>
            <input
              type="number"
              step="0.01"
              style={{ width: "6rem" }}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            <button disabled={!valor || !desde} onClick={() => void crearRevision()}>
              {t("tarifas.crearRevision")}
            </button>
            <span className="ayuda">{t("tarifas.notaRedondeo")}</span>
          </div>
          <div className="tabla-scroll" style={{ marginTop: "0.8rem" }}>
            <table>
              <thead>
                <tr>
                  <th>{t("tarifas.codigo")}</th>
                  <th>{t("catalogo.modelo")}</th>
                  <th>{t("tarifas.canales.efectivo")}</th>
                  <th>{t("tarifas.canales.tarjetaEmpleado")}</th>
                  <th>{t("tarifas.canales.tarjetaBancaria")}</th>
                  <th>{t("tarifas.canales.app")}</th>
                  <th>{t("tarifas.precioFacturado")}</th>
                </tr>
              </thead>
              <tbody>
                {seleccionada.lineas.map((l, i) => (
                  <tr key={i}>
                    <td>
                      {l.tipo === "seleccion" ? `☕ ${l.codigo}` : l.codigo}
                    </td>
                    <td>{l.nombre}</td>
                    <td>{moneda.format(l.precios.efectivo)}</td>
                    <td>{moneda.format(l.precios.tarjetaEmpleado)}</td>
                    <td>{moneda.format(l.precios.tarjetaBancaria)}</td>
                    <td>{moneda.format(l.precios.app)}</td>
                    <td>
                      {l.precioFacturadoCliente !== undefined
                        ? moneda.format(l.precioFacturadoCliente)
                        : ""}
                    </td>
                  </tr>
                ))}
                {seleccionada.combos.map((c, i) => (
                  <tr key={`c${i}`}>
                    <td>🧺 {c.codigos.join("+")}</td>
                    <td>{c.nombre}</td>
                    <td>{moneda.format(c.precios.efectivo)}</td>
                    <td>{moneda.format(c.precios.tarjetaEmpleado)}</td>
                    <td>{moneda.format(c.precios.tarjetaBancaria)}</td>
                    <td>{moneda.format(c.precios.app)}</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {seleccionada.condiciones.length > 0 && (
            <ul style={{ marginTop: "0.6rem" }}>
              {seleccionada.condiciones.map((c, i) => (
                <li key={i}>
                  {t(`condiciones.${c.tipo}`)}
                  {c.descripcion ? ` — ${c.descripcion}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
