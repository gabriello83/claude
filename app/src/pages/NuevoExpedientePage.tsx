import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getDocs, orderBy, query } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { db } from "@/lib/firebase";
import { col, crearExpediente } from "@/lib/db";
import { useAuth } from "@/auth/AuthContext";
import type {
  Canon,
  Cliente,
  CondicionEspecial,
  Equipamiento,
  MaquinaExpediente,
  ModeloMaquina,
  Periferico,
  TipoCondicionEspecial,
  TipoEquipamiento,
  TipoExpediente,
} from "@/types/domain";

const TIPOS_EXPEDIENTE: TipoExpediente[] = [
  "instalacion",
  "retirada",
  "sustitucion",
  "cambio_planograma",
  "subida_precios",
];

const PERIFERICOS: Periferico[] = [
  "monedero",
  "lector_tarjeta",
  "billetero",
  "llave_privada",
  "app_pago",
];
const TIPOS_CONDICION: TipoCondicionEspecial[] = [
  "cafe_facturado",
  "combo",
  "gratuidad_diaria",
  "dia_gratis_anual",
  "lote_navidad",
  "otro",
];
const TIPOS_EQUIPAMIENTO: TipoEquipamiento[] = [
  "mueble",
  "panelado",
  "microondas",
  "fuente_agua",
  "otro",
];

type MaquinaForm = Omit<MaquinaExpediente, "id">;
type EquipForm = Omit<Equipamiento, "id">;

/** Registro de la oferta ganada — paso 1 del workflow (lo rellena el comercial) */
export function NuevoExpedientePage() {
  const { t } = useTranslation();
  const { sesion } = useAuth();
  const navigate = useNavigate();

  const [modelos, setModelos] = useState<ModeloMaquina[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Tipo de expediente (D22) y modo de cliente
  const [tipoExp, setTipoExp] = useState<TipoExpediente>("instalacion");
  const [clienteModo, setClienteModo] = useState<"nuevo" | "existente">("nuevo");
  const [clientes, setClientes] = useState<(Cliente & { id: string })[]>([]);
  const [clienteExistenteId, setClienteExistenteId] = useState("");

  // Cliente
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [contactoEmail, setContactoEmail] = useState("");
  const [tipoOferta, setTipoOferta] = useState<"publica" | "privada">("privada");

  // Instalación (q41: la rellena el comercial)
  const [fechaPrevista, setFechaPrevista] = useState("");
  const [requisitos, setRequisitos] = useState("");

  // Canon (D11: solo informativo)
  const [canonTipo, setCanonTipo] = useState<Canon["tipo"]>("sin_canon");
  const [canonImporte, setCanonImporte] = useState("");
  const [canonPorcentaje, setCanonPorcentaje] = useState("");
  const [canonNotas, setCanonNotas] = useState("");

  const [condiciones, setCondiciones] = useState<CondicionEspecial[]>([]);
  const [maquinas, setMaquinas] = useState<MaquinaForm[]>([]);
  const [equipamiento, setEquipamiento] = useState<EquipForm[]>([]);

  useEffect(() => {
    if (!sesion) return;
    getDocs(query(col.modelosMaquina(sesion.tenantId), orderBy("codigo"))).then((snap) =>
      setModelos(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ModeloMaquina)),
    );
    getDocs(col.clientes(sesion.tenantId)).then((snap) =>
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Cliente & { id: string })),
    );
  }, [sesion]);

  const cambiarTipo = (tipo: TipoExpediente) => {
    setTipoExp(tipo);
    // Retiradas, sustituciones y cambios son sobre clientes ya instalados
    setClienteModo(tipo === "instalacion" ? "nuevo" : "existente");
  };

  const addMaquina = () =>
    setMaquinas((m) => [
      ...m,
      {
        modeloId: modelos[0]?.id ?? "",
        nueva: true,
        perifericos: ["monedero"],
        telemetria: { activa: false },
      },
    ]);

  const setMaquina = (i: number, patch: Partial<MaquinaForm>) =>
    setMaquinas((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const addEquip = () =>
    setEquipamiento((e) => [
      ...e,
      { tipo: "mueble", descripcion: "", proveedor: "", coste: 0, estadoSolicitud: "pendiente" },
    ]);

  const setEquip = (i: number, patch: Partial<EquipForm>) =>
    setEquipamiento((es) => es.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  const addCondicion = () =>
    setCondiciones((c) => [...c, { tipo: "cafe_facturado", descripcion: "" }]);

  const setCondicion = (i: number, patch: Partial<CondicionEspecial>) =>
    setCondiciones((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!sesion) return;
    setGuardando(true);
    try {
      const canon: Canon = {
        tipo: canonTipo,
        ...(canonImporte ? { importeFijo: Number(canonImporte) } : {}),
        ...(canonPorcentaje ? { porcentajeVariable: Number(canonPorcentaje) } : {}),
        ...(canonNotas ? { notas: canonNotas } : {}),
      };
      const existente = clientes.find((c) => c.id === clienteExistenteId);
      const id = await crearExpediente(db, sesion.tenantId, {
        ...(clienteModo === "existente" && existente
          ? { clienteExistente: { id: existente.id, nombre: existente.nombre } }
          : {
              cliente: {
                nombre,
                direccionInstalacion: direccion,
                contacto: {
                  nombre: contactoNombre,
                  telefono: contactoTelefono,
                  email: contactoEmail,
                },
              },
            }),
        expediente: {
          tipo: tipoExp,
          tipoOferta,
          canon,
          condicionesEspeciales: condiciones,
          propuestaInversion: null,
          instalacion: {
            ...(fechaPrevista ? { fechaPrevista } : {}),
            ...(contactoNombre ? { contactoCliente: contactoNombre } : {}),
            ...(requisitos ? { requisitosUbicacion: requisitos } : {}),
          },
          creadoPor: sesion.user.email ?? "",
        },
        maquinas,
        equipamiento,
      });
      navigate(`/expedientes/${id}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section>
      <h1>{t("nuevoExpediente.title")}</h1>
      <form className="formulario" onSubmit={onSubmit}>
        <fieldset>
          <legend>{t("nuevoExpediente.cliente")}</legend>
          <div className="fila">
            <label>
              {t("nuevoExpediente.tipoExpediente")}
              <select value={tipoExp} onChange={(e) => cambiarTipo(e.target.value as TipoExpediente)}>
                {TIPOS_EXPEDIENTE.map((tp) => (
                  <option key={tp} value={tp}>
                    {t(`expedientes.tipos.${tp}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("nuevoExpediente.tipoOferta")}
              <select
                value={tipoOferta}
                onChange={(e) => setTipoOferta(e.target.value as "publica" | "privada")}
              >
                <option value="privada">{t("expedientes.ofertas.privada")}</option>
                <option value="publica">{t("expedientes.ofertas.publica")}</option>
              </select>
            </label>
            <label>
              {t("nuevoExpediente.clienteModo")}
              <select
                value={clienteModo}
                onChange={(e) => setClienteModo(e.target.value as "nuevo" | "existente")}
              >
                <option value="nuevo">{t("nuevoExpediente.clienteNuevo")}</option>
                <option value="existente">{t("nuevoExpediente.clienteExistente")}</option>
              </select>
            </label>
          </div>
          {clienteModo === "existente" ? (
            <label>
              {t("nuevoExpediente.seleccionarCliente")}
              <select
                value={clienteExistenteId}
                onChange={(e) => setClienteExistenteId(e.target.value)}
                required
              >
                <option value="" disabled>
                  —
                </option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} — {c.direccionInstalacion}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <div className="fila">
                <label className="crece">
                  {t("nuevoExpediente.nombreCliente")}
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                </label>
              </div>
              <label>
                {t("nuevoExpediente.direccion")}
                <input value={direccion} onChange={(e) => setDireccion(e.target.value)} required />
              </label>
              <div className="fila">
                <label>
                  {t("nuevoExpediente.contacto")}
                  <input value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)} />
                </label>
                <label>
                  {t("nuevoExpediente.telefono")}
                  <input value={contactoTelefono} onChange={(e) => setContactoTelefono(e.target.value)} />
                </label>
                <label>
                  {t("nuevoExpediente.email")}
                  <input
                    type="email"
                    value={contactoEmail}
                    onChange={(e) => setContactoEmail(e.target.value)}
                  />
                </label>
              </div>
            </>
          )}
          <div className="fila">
            <label>
              {t("nuevoExpediente.fechaPrevista")}
              <input
                type="date"
                value={fechaPrevista}
                onChange={(e) => setFechaPrevista(e.target.value)}
              />
            </label>
            <label className="crece">
              {t("nuevoExpediente.requisitos")}
              <input
                value={requisitos}
                onChange={(e) => setRequisitos(e.target.value)}
                placeholder={t("nuevoExpediente.requisitosHint")}
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>{t("nuevoExpediente.maquinas")}</legend>
          {maquinas.map((m, i) => (
            <div className="fila tarjeta-linea" key={i}>
              <label className="crece">
                {t("nuevoExpediente.modelo")}
                <select value={m.modeloId} onChange={(e) => setMaquina(i, { modeloId: e.target.value })}>
                  {modelos.map((mod) => (
                    <option key={mod.id} value={mod.id}>
                      {mod.codigo} — {mod.marca} {mod.modelo}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("nuevoExpediente.estadoMaquina")}
                <select
                  value={m.nueva ? "nueva" : "usada"}
                  onChange={(e) => setMaquina(i, { nueva: e.target.value === "nueva" })}
                >
                  <option value="nueva">{t("nuevoExpediente.nueva")}</option>
                  <option value="usada">{t("nuevoExpediente.usada")}</option>
                </select>
              </label>
              <label>
                {t("nuevoExpediente.perifericos")}
                <select
                  multiple
                  value={m.perifericos}
                  onChange={(e) =>
                    setMaquina(i, {
                      perifericos: [...e.target.selectedOptions].map(
                        (o) => o.value as Periferico,
                      ),
                    })
                  }
                >
                  {PERIFERICOS.map((p) => (
                    <option key={p} value={p}>
                      {t(`perifericos.${p}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("nuevoExpediente.telemetria")}
                <input
                  type="checkbox"
                  checked={m.telemetria.activa}
                  onChange={(e) => setMaquina(i, { telemetria: { activa: e.target.checked } })}
                />
              </label>
              <button type="button" className="secundario" onClick={() => setMaquinas((ms) => ms.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="secundario" onClick={addMaquina} disabled={modelos.length === 0}>
            {t("nuevoExpediente.addMaquina")}
          </button>
        </fieldset>

        <fieldset>
          <legend>{t("nuevoExpediente.equipamiento")}</legend>
          <p className="ayuda">{t("nuevoExpediente.equipamientoAyuda")}</p>
          {equipamiento.map((eq, i) => (
            <div className="fila tarjeta-linea" key={i}>
              <label>
                {t("nuevoExpediente.tipoEquipamiento")}
                <select
                  value={eq.tipo}
                  onChange={(e) => setEquip(i, { tipo: e.target.value as TipoEquipamiento })}
                >
                  {TIPOS_EQUIPAMIENTO.map((tp) => (
                    <option key={tp} value={tp}>
                      {t(`equipamiento.${tp}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crece">
                {t("nuevoExpediente.descripcion")}
                <input value={eq.descripcion} onChange={(e) => setEquip(i, { descripcion: e.target.value })} />
              </label>
              <label>
                {t("nuevoExpediente.proveedor")}
                <input value={eq.proveedor} onChange={(e) => setEquip(i, { proveedor: e.target.value })} />
              </label>
              <label>
                {t("nuevoExpediente.coste")}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={eq.coste || ""}
                  onChange={(e) => setEquip(i, { coste: Number(e.target.value) })}
                />
              </label>
              <button type="button" className="secundario" onClick={() => setEquipamiento((es) => es.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="secundario" onClick={addEquip}>
            {t("nuevoExpediente.addEquipamiento")}
          </button>
        </fieldset>

        <fieldset>
          <legend>{t("nuevoExpediente.canon")}</legend>
          <div className="fila">
            <label>
              {t("nuevoExpediente.tipoCanon")}
              <select value={canonTipo} onChange={(e) => setCanonTipo(e.target.value as Canon["tipo"])}>
                {(["sin_canon", "fijo", "variable", "mixto"] as const).map((c) => (
                  <option key={c} value={c}>
                    {t(`canon.${c}`)}
                  </option>
                ))}
              </select>
            </label>
            {(canonTipo === "fijo" || canonTipo === "mixto") && (
              <label>
                {t("nuevoExpediente.importeFijo")}
                <input type="number" step="0.01" value={canonImporte} onChange={(e) => setCanonImporte(e.target.value)} />
              </label>
            )}
            {(canonTipo === "variable" || canonTipo === "mixto") && (
              <label>
                {t("nuevoExpediente.porcentaje")}
                <input type="number" step="0.1" value={canonPorcentaje} onChange={(e) => setCanonPorcentaje(e.target.value)} />
              </label>
            )}
            <label className="crece">
              {t("nuevoExpediente.notas")}
              <input value={canonNotas} onChange={(e) => setCanonNotas(e.target.value)} />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>{t("nuevoExpediente.condiciones")}</legend>
          {condiciones.map((c, i) => (
            <div className="fila tarjeta-linea" key={i}>
              <label>
                {t("nuevoExpediente.tipoCondicion")}
                <select
                  value={c.tipo}
                  onChange={(e) => setCondicion(i, { tipo: e.target.value as TipoCondicionEspecial })}
                >
                  {TIPOS_CONDICION.map((tp) => (
                    <option key={tp} value={tp}>
                      {t(`condiciones.${tp}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crece">
                {t("nuevoExpediente.descripcion")}
                <input value={c.descripcion} onChange={(e) => setCondicion(i, { descripcion: e.target.value })} />
              </label>
              <button type="button" className="secundario" onClick={() => setCondiciones((cs) => cs.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="secundario" onClick={addCondicion}>
            {t("nuevoExpediente.addCondicion")}
          </button>
        </fieldset>

        <button
          type="submit"
          disabled={
            guardando ||
            (clienteModo === "nuevo" ? !nombre || !direccion : !clienteExistenteId)
          }
        >
          {t("nuevoExpediente.crear")}
        </button>
      </form>
    </section>
  );
}
