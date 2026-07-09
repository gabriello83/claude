import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { db } from "@/lib/firebase";
import { useAuth, tieneRol } from "@/auth/AuthContext";
import { VARIABLES_CORREO, plantillaDefecto } from "@/lib/correos";
import type { Idioma, TenantConfig, TipoCorreo } from "@/types/domain";

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

const lista = (s: string) =>
  s.split(",").map((x) => x.trim()).filter(Boolean);

export function ConfiguracionPage() {
  const { t } = useTranslation();
  const { sesion } = useAuth();
  const [config, setConfig] = useState<Partial<TenantConfig> | null>(null);
  const [guardado, setGuardado] = useState(false);

  // Direcciones por tipo (texto separado por comas)
  const [para, setPara] = useState<Record<string, string>>({});
  const [cc, setCc] = useState<Record<string, string>>({});

  // Plantilla en edición
  const [tipoPlantilla, setTipoPlantilla] = useState<TipoCorreo>("preparacion_tecnica");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");

  // SMTP
  const [smtp, setSmtp] = useState({ host: "", puerto: "587", usuario: "", password: "", remitente: "" });

  useEffect(() => {
    if (!sesion) return;
    getDoc(doc(db, "tenants", sesion.tenantId)).then((snap) => {
      const c = (snap.data() ?? {}) as Partial<TenantConfig>;
      setConfig(c);
      const p: Record<string, string> = {};
      const ccs: Record<string, string> = {};
      for (const tipo of TIPOS) {
        p[tipo] = c.correos?.[tipo]?.para?.join(", ") ?? "";
        ccs[tipo] = c.correos?.[tipo]?.cc?.join(", ") ?? "";
      }
      setPara(p);
      setCc(ccs);
    });
  }, [sesion]);

  useEffect(() => {
    if (!sesion || !config) return;
    getDoc(doc(db, "tenants", sesion.tenantId, "plantillasCorreo", tipoPlantilla)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data() as { asunto: string; cuerpo: string };
        setAsunto(d.asunto);
        setCuerpo(d.cuerpo);
      } else {
        const def = plantillaDefecto((config.idioma as Idioma) ?? "es", tipoPlantilla);
        setAsunto(def.asunto);
        setCuerpo(def.cuerpo);
      }
    });
  }, [sesion, config, tipoPlantilla]);

  if (!sesion || !tieneRol(sesion, "admin")) return <p>—</p>;
  if (!config) return <p>{t("common.loading")}</p>;

  const marcarGuardado = () => {
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  const guardarDirecciones = async () => {
    const correos: TenantConfig["correos"] = {};
    for (const tipo of TIPOS) {
      if (lista(para[tipo] ?? "").length || lista(cc[tipo] ?? "").length) {
        correos[tipo] = { para: lista(para[tipo] ?? ""), cc: lista(cc[tipo] ?? "") };
      }
    }
    await setDoc(doc(db, "tenants", sesion.tenantId), { ...config, correos }, { merge: true });
    setConfig((c) => ({ ...c, correos }));
    marcarGuardado();
  };

  const guardarPlantilla = async () => {
    await setDoc(doc(db, "tenants", sesion.tenantId, "plantillasCorreo", tipoPlantilla), {
      asunto,
      cuerpo,
    });
    marcarGuardado();
  };

  const guardarSmtp = async () => {
    await setDoc(doc(db, "tenants", sesion.tenantId, "secretos", "smtp"), {
      host: smtp.host,
      puerto: Number(smtp.puerto),
      usuario: smtp.usuario,
      password: smtp.password,
      remitente: smtp.remitente,
    });
    marcarGuardado();
  };

  return (
    <section>
      <h1>{t("config.title")}</h1>
      {guardado && <div className="ok">{t("config.guardado")}</div>}

      <div className="formulario">
        <fieldset>
          <legend>{t("config.direcciones")}</legend>
          {TIPOS.map((tipo) => (
            <div className="fila tarjeta-linea" key={tipo}>
              <span className="tipo-correo">{t(`correos.tipos.${tipo}`)}</span>
              <label className="crece">
                {t("config.para")}
                <input value={para[tipo] ?? ""} onChange={(e) => setPara((p) => ({ ...p, [tipo]: e.target.value }))} />
              </label>
              <label className="crece">
                {t("config.cc")}
                <input value={cc[tipo] ?? ""} onChange={(e) => setCc((p) => ({ ...p, [tipo]: e.target.value }))} />
              </label>
            </div>
          ))}
          <button onClick={() => void guardarDirecciones()}>{t("common.save")}</button>
        </fieldset>

        <fieldset>
          <legend>{t("config.plantillas")}</legend>
          <label>
            {t("correos.title")}
            <select value={tipoPlantilla} onChange={(e) => setTipoPlantilla(e.target.value as TipoCorreo)}>
              {TIPOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {t(`correos.tipos.${tipo}`)}
                </option>
              ))}
            </select>
          </label>
          <p className="ayuda">
            {t("config.variables")}: {VARIABLES_CORREO[tipoPlantilla].map((v) => `{{${v}}}`).join(" ")}
          </p>
          <label>
            {t("config.asunto")}
            <input value={asunto} onChange={(e) => setAsunto(e.target.value)} />
          </label>
          <label>
            {t("config.cuerpo")}
            <textarea rows={8} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
          </label>
          <button onClick={() => void guardarPlantilla()}>{t("common.save")}</button>
        </fieldset>

        <fieldset>
          <legend>{t("config.smtp")}</legend>
          <div className="fila">
            <label className="crece">
              {t("config.host")}
              <input value={smtp.host} onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))} placeholder="smtp.office365.com" />
            </label>
            <label>
              {t("config.puerto")}
              <input value={smtp.puerto} onChange={(e) => setSmtp((s) => ({ ...s, puerto: e.target.value }))} />
            </label>
          </div>
          <div className="fila">
            <label className="crece">
              {t("config.usuario")}
              <input value={smtp.usuario} onChange={(e) => setSmtp((s) => ({ ...s, usuario: e.target.value }))} />
            </label>
            <label className="crece">
              {t("config.password")}
              <input type="password" value={smtp.password} onChange={(e) => setSmtp((s) => ({ ...s, password: e.target.value }))} />
            </label>
            <label className="crece">
              {t("config.remitente")}
              <input value={smtp.remitente} onChange={(e) => setSmtp((s) => ({ ...s, remitente: e.target.value }))} placeholder="vending@operador.com" />
            </label>
          </div>
          <button onClick={() => void guardarSmtp()}>{t("common.save")}</button>
        </fieldset>
      </div>
    </section>
  );
}
