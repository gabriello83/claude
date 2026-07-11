import { useEffect, useState } from "react";
import {
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { db } from "@/lib/firebase";
import { col } from "@/lib/db";
import { useAuth, tieneRol } from "@/auth/AuthContext";
import type { Delegacion, Fabricante, TenantConfig, TipoCorreo } from "@/types/domain";

const TIPOS: TipoCorreo[] = [
  "preparacion_tecnica",
  "solicitud_proveedor",
  "aviso_cliente_nuevo",
  "planograma_fabricante",
  "peticion_cambio",
  "orden_instalacion",
  "alta_ruta",
  "exceso_inversion",
];

const lista = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function EmpresaPage() {
  const { t } = useTranslation();
  const { sesion } = useAuth();
  const [guardado, setGuardado] = useState(false);

  const [nombreEmpresa, setNombreEmpresa] = useState("");

  const [delegaciones, setDelegaciones] = useState<Delegacion[]>([]);
  const [delSel, setDelSel] = useState<string>("");
  const [delCorreos, setDelCorreos] = useState<Record<string, { para: string; cc: string }>>({});
  const [nuevaDeleg, setNuevaDeleg] = useState("");

  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [marcasCatalogo, setMarcasCatalogo] = useState<string[]>([]);
  const [fabMarca, setFabMarca] = useState("");
  const [fabEmail, setFabEmail] = useState("");
  const [fabContacto, setFabContacto] = useState("");

  useEffect(() => {
    if (!sesion) return;
    const t0 = sesion.tenantId;
    const unsubDel = onSnapshot(col.delegaciones(t0), (snap) =>
      setDelegaciones(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Delegacion)),
    );
    const unsubFab = onSnapshot(col.fabricantes(t0), (snap) =>
      setFabricantes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Fabricante)),
    );
    getDocs(col.modelosMaquina(t0)).then((snap) => {
      const marcas = new Set<string>();
      snap.forEach((d) => {
        const m = (d.data().marca as string)?.trim();
        if (m) marcas.add(m);
      });
      setMarcasCatalogo([...marcas].sort());
    });
    getDoc(doc(db, "tenants", t0)).then((s) =>
      setNombreEmpresa((s.data()?.nombreEmpresa as string) ?? ""),
    );
    return () => {
      unsubDel();
      unsubFab();
    };
  }, [sesion]);

  // Al elegir una delegación, cargar sus correos en el formulario
  useEffect(() => {
    const d = delegaciones.find((x) => x.id === delSel);
    const m: Record<string, { para: string; cc: string }> = {};
    for (const tipo of TIPOS) {
      m[tipo] = {
        para: d?.correos?.[tipo]?.para?.join(", ") ?? "",
        cc: d?.correos?.[tipo]?.cc?.join(", ") ?? "",
      };
    }
    setDelCorreos(m);
  }, [delSel, delegaciones]);

  if (!sesion || !tieneRol(sesion, "admin")) return <p>—</p>;

  const flash = () => {
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  const guardarEmpresa = async () => {
    await setDoc(doc(db, "tenants", sesion.tenantId), { nombreEmpresa }, { merge: true });
    flash();
  };

  const crearDelegacion = async () => {
    if (!nuevaDeleg.trim()) return;
    const ref = await addDoc(col.delegaciones(sesion.tenantId), {
      nombre: nuevaDeleg.trim(),
      correos: {},
    });
    setNuevaDeleg("");
    setDelSel(ref.id);
  };

  const borrarDelegacion = async (id: string) => {
    if (!window.confirm(t("empresa.confirmarBorrarDeleg"))) return;
    await deleteDoc(doc(db, "tenants", sesion.tenantId, "delegaciones", id));
    if (delSel === id) setDelSel("");
  };

  const guardarCorreosDeleg = async () => {
    if (!delSel) return;
    const correos: TenantConfig["correos"] = {};
    for (const tipo of TIPOS) {
      const p = lista(delCorreos[tipo]?.para ?? "");
      const c = lista(delCorreos[tipo]?.cc ?? "");
      if (p.length || c.length) correos[tipo] = { para: p, cc: c };
    }
    const d = delegaciones.find((x) => x.id === delSel);
    await setDoc(doc(db, "tenants", sesion.tenantId, "delegaciones", delSel), {
      nombre: d?.nombre ?? "",
      correos,
    });
    flash();
  };

  const guardarFabricante = async () => {
    if (!fabMarca.trim() || !fabEmail.trim()) return;
    await setDoc(doc(db, "tenants", sesion.tenantId, "fabricantes", fabMarca.trim()), {
      marca: fabMarca.trim(),
      email: fabEmail.trim(),
      ...(fabContacto.trim() ? { contacto: fabContacto.trim() } : {}),
    });
    setFabMarca("");
    setFabEmail("");
    setFabContacto("");
    flash();
  };

  const borrarFabricante = async (id: string) => {
    await deleteDoc(doc(db, "tenants", sesion.tenantId, "fabricantes", id));
  };

  return (
    <section>
      <h1>{t("empresa.title")}</h1>
      {guardado && <div className="ok">{t("config.guardado")}</div>}

      <div className="formulario">
        <fieldset>
          <legend>{t("empresa.datos")}</legend>
          <label>
            {t("empresa.nombreEmpresa")}
            <input value={nombreEmpresa} onChange={(e) => setNombreEmpresa(e.target.value)} />
          </label>
          <button onClick={() => void guardarEmpresa()}>{t("common.save")}</button>
        </fieldset>

        <fieldset>
          <legend>{t("empresa.delegaciones")}</legend>
          <p className="ayuda">{t("empresa.delegacionesAyuda")}</p>
          <ul className="lista-tareas">
            {delegaciones.map((d) => (
              <li key={d.id}>
                <strong>{d.nombre}</strong>
                <button className="secundario" style={{ marginLeft: "0.6rem" }} onClick={() => setDelSel(d.id)}>
                  {t("empresa.editarCorreos")}
                </button>
                <button className="secundario" style={{ marginLeft: "0.4rem" }} onClick={() => void borrarDelegacion(d.id)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="form-inline">
            <input
              placeholder={t("empresa.nuevaDelegacion")}
              value={nuevaDeleg}
              onChange={(e) => setNuevaDeleg(e.target.value)}
            />
            <button className="secundario" onClick={() => void crearDelegacion()}>
              {t("empresa.addDelegacion")}
            </button>
          </div>

          {delSel && (
            <div className="tarjeta-linea" style={{ marginTop: "0.8rem" }}>
              <h3>
                {t("empresa.correosDe")} {delegaciones.find((d) => d.id === delSel)?.nombre}
              </h3>
              <p className="ayuda">{t("empresa.herencia")}</p>
              {TIPOS.map((tipo) => (
                <div className="fila" key={tipo}>
                  <span className="tipo-correo">{t(`correos.tipos.${tipo}`)}</span>
                  <label className="crece">
                    {t("config.para")}
                    <input
                      value={delCorreos[tipo]?.para ?? ""}
                      onChange={(e) =>
                        setDelCorreos((m) => ({ ...m, [tipo]: { ...m[tipo], para: e.target.value } }))
                      }
                    />
                  </label>
                  <label className="crece">
                    {t("config.cc")}
                    <input
                      value={delCorreos[tipo]?.cc ?? ""}
                      onChange={(e) =>
                        setDelCorreos((m) => ({ ...m, [tipo]: { ...m[tipo], cc: e.target.value } }))
                      }
                    />
                  </label>
                </div>
              ))}
              <button onClick={() => void guardarCorreosDeleg()}>{t("common.save")}</button>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>{t("empresa.fabricantes")}</legend>
          <p className="ayuda">{t("empresa.fabricantesAyuda")}</p>
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("catalogo.marca")}</th>
                  <th>{t("empresa.email")}</th>
                  <th>{t("empresa.contacto")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {fabricantes.map((f) => (
                  <tr key={f.id}>
                    <td>{f.marca}</td>
                    <td>{f.email}</td>
                    <td>{f.contacto ?? ""}</td>
                    <td>
                      <button className="secundario" onClick={() => void borrarFabricante(f.id)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="fila" style={{ marginTop: "0.6rem" }}>
            <label>
              {t("catalogo.marca")}
              <input
                list="marcas-catalogo"
                value={fabMarca}
                onChange={(e) => setFabMarca(e.target.value)}
              />
              <datalist id="marcas-catalogo">
                {marcasCatalogo.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>
            <label className="crece">
              {t("empresa.email")}
              <input type="email" value={fabEmail} onChange={(e) => setFabEmail(e.target.value)} />
            </label>
            <label className="crece">
              {t("empresa.contacto")}
              <input value={fabContacto} onChange={(e) => setFabContacto(e.target.value)} />
            </label>
            <button className="secundario" onClick={() => void guardarFabricante()}>
              {t("empresa.addFabricante")}
            </button>
          </div>
        </fieldset>
      </div>
    </section>
  );
}
