// Motor del workflow fijo (D6, D22): cada tipo de expediente tiene su
// secuencia de estados y sus tareas por paso. En una fase posterior las
// transiciones pasarán a Cloud Functions; la forma de los datos no cambia.

import type {
  EstadoExpediente,
  Expediente,
  Rol,
  TareaExpediente,
  TipoExpediente,
} from "@/types/domain";

/** Secuencia de estados por tipo de expediente (D22) */
export const FLUJOS: Record<TipoExpediente, EstadoExpediente[]> = {
  instalacion: [
    "registrado",
    "preparacion_tecnica",
    "alta_administrativa",
    "instalacion",
    "alta_en_ruta",
    "completado",
  ],
  retirada: ["registrado", "ejecucion", "alta_en_ruta", "completado"],
  sustitucion: [
    "registrado",
    "preparacion_tecnica",
    "ejecucion",
    "alta_en_ruta",
    "completado",
  ],
  cambio_planograma: ["registrado", "preparacion_tecnica", "ejecucion", "completado"],
  subida_precios: ["registrado", "preparacion_tecnica", "ejecucion", "completado"],
};

/** Quién puede avanzar desde cada estado (admin y dirección siempre pueden) */
const ROLES_TRANSICION: Record<EstadoExpediente, Rol[]> = {
  registrado: ["comercial", "tecnico", "administracion"],
  preparacion_tecnica: ["tecnico"],
  alta_administrativa: ["administracion"],
  instalacion: ["tecnico", "comercial"],
  ejecucion: ["tecnico", "operaciones"],
  alta_en_ruta: ["operaciones"],
  completado: [],
  cancelado: [],
};

type PlantillaTarea = { rol: Rol; titulo: string };
type TareasPorEstado = Partial<Record<EstadoExpediente, PlantillaTarea[]>>;

/** Tareas que se generan al entrar en cada estado (títulos = claves i18n) */
const TAREAS: Record<TipoExpediente, TareasPorEstado> = {
  instalacion: {
    registrado: [
      // Aviso a administración con la pregunta de la propuesta de inversión (D25)
      { rol: "administracion", titulo: "tareas.responderInversion" },
      { rol: "comercial", titulo: "tareas.revisarDatosOferta" },
    ],
    preparacion_tecnica: [
      { rol: "tecnico", titulo: "tareas.prepararMaquinas" },
      { rol: "tecnico", titulo: "tareas.solicitarProveedores" },
      { rol: "tecnico", titulo: "tareas.crearPlanogramas" },
      { rol: "tecnico", titulo: "tareas.pedirCambio" },
    ],
    alta_administrativa: [
      { rol: "administracion", titulo: "tareas.altaClienteERP" },
      { rol: "administracion", titulo: "tareas.prepararCambio" },
    ],
    instalacion: [
      { rol: "tecnico", titulo: "tareas.enviarOrdenInstalacion" },
      { rol: "tecnico", titulo: "tareas.confirmarInstalacion" },
    ],
    alta_en_ruta: [
      { rol: "operaciones", titulo: "tareas.enviarAltaRuta" },
      { rol: "operaciones", titulo: "tareas.rellenarERP" }, // supervisor → ERP (D23)
    ],
  },
  retirada: {
    registrado: [
      { rol: "tecnico", titulo: "tareas.prepararRetirada" },
      { rol: "administracion", titulo: "tareas.avisarAdministracion" },
    ],
    ejecucion: [
      { rol: "tecnico", titulo: "tareas.enviarOrdenIntervencion" },
      { rol: "tecnico", titulo: "tareas.confirmarIntervencion" },
    ],
    alta_en_ruta: [
      { rol: "operaciones", titulo: "tareas.bajaRuta" },
      { rol: "operaciones", titulo: "tareas.rellenarERP" },
    ],
  },
  sustitucion: {
    registrado: [{ rol: "comercial", titulo: "tareas.revisarDatosOferta" }],
    preparacion_tecnica: [
      { rol: "tecnico", titulo: "tareas.prepararMaquinas" },
      { rol: "tecnico", titulo: "tareas.solicitarProveedores" },
      { rol: "tecnico", titulo: "tareas.crearPlanogramas" },
    ],
    ejecucion: [
      { rol: "tecnico", titulo: "tareas.enviarOrdenIntervencion" },
      { rol: "tecnico", titulo: "tareas.confirmarIntervencion" },
    ],
    alta_en_ruta: [
      { rol: "operaciones", titulo: "tareas.enviarAltaRuta" },
      { rol: "operaciones", titulo: "tareas.rellenarERP" },
    ],
  },
  cambio_planograma: {
    registrado: [{ rol: "comercial", titulo: "tareas.revisarDatosOferta" }],
    preparacion_tecnica: [{ rol: "tecnico", titulo: "tareas.nuevoPlanograma" }],
    ejecucion: [
      { rol: "tecnico", titulo: "tareas.enviarOrdenIntervencion" },
      { rol: "tecnico", titulo: "tareas.confirmarIntervencion" },
    ],
  },
  subida_precios: {
    registrado: [{ rol: "administracion", titulo: "tareas.avisarAdministracion" }],
    preparacion_tecnica: [{ rol: "comercial", titulo: "tareas.nuevaTarifa" }],
    ejecucion: [
      { rol: "tecnico", titulo: "tareas.enviarOrdenIntervencion" },
      { rol: "tecnico", titulo: "tareas.confirmarIntervencion" },
    ],
  },
};

let contadorTarea = 0;
function nuevaTareaId(): string {
  contadorTarea += 1;
  return `t${Date.now()}_${contadorTarea}`;
}

export function tareasParaEstado(
  tipo: TipoExpediente,
  estado: EstadoExpediente,
): TareaExpediente[] {
  return (TAREAS[tipo][estado] ?? []).map((t) => ({
    id: nuevaTareaId(),
    rolResponsable: t.rol,
    titulo: t.titulo,
    estado: "pendiente",
    paso: estado,
  }));
}

export function flujoDe(expediente: Pick<Expediente, "tipo">): EstadoExpediente[] {
  return FLUJOS[expediente.tipo] ?? FLUJOS.instalacion;
}

export function siguienteEstado(expediente: Expediente): EstadoExpediente | null {
  const flujo = flujoDe(expediente);
  const i = flujo.indexOf(expediente.estado);
  if (i < 0 || i === flujo.length - 1) return null;
  return flujo[i + 1];
}

export function puedeAvanzar(expediente: Expediente, roles: Rol[]): boolean {
  if (expediente.estado === "completado" || expediente.estado === "cancelado") return false;
  if (roles.includes("admin") || roles.includes("direccion")) return true;
  return ROLES_TRANSICION[expediente.estado].some((r) => roles.includes(r));
}

/** Al avanzar: nuevas tareas del paso siguiente se añaden a las existentes */
export function avanzar(expediente: Expediente): Pick<Expediente, "estado" | "tareas"> | null {
  const destino = siguienteEstado(expediente);
  if (!destino) return null;
  return {
    estado: destino,
    tareas: [...expediente.tareas, ...tareasParaEstado(expediente.tipo, destino)],
  };
}

// ---- Control de costes vs propuesta de inversión (D25) ----

export function costeTotal(expediente: Expediente): number {
  return expediente.lineasCoste.reduce((s, l) => s + (l.importe || 0), 0);
}

export function excesoInversion(expediente: Expediente): number | null {
  const p = expediente.propuestaInversion;
  if (!p?.existe || !p.importe) return null;
  const exceso = costeTotal(expediente) - p.importe;
  return exceso > 0 ? exceso : null;
}
