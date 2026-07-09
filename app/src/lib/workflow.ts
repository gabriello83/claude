// Motor del workflow fijo de instalación (D6, diseño funcional §3).
// En la Fase 3 las transiciones pasarán a Cloud Functions junto con los
// correos; la forma de los datos no cambia.

import type {
  EstadoExpediente,
  Expediente,
  Rol,
  TareaExpediente,
} from "@/types/domain";

/** Orden del flujo de instalación */
export const ORDEN_ESTADOS: EstadoExpediente[] = [
  "registrado",
  "preparacion_tecnica",
  "alta_administrativa",
  "instalacion",
  "alta_en_ruta",
  "completado",
];

/** Quién puede avanzar desde cada estado (admin y dirección siempre pueden) */
const ROLES_TRANSICION: Record<EstadoExpediente, Rol[]> = {
  registrado: ["comercial"],
  preparacion_tecnica: ["tecnico"],
  alta_administrativa: ["administracion"],
  instalacion: ["tecnico", "comercial"],
  alta_en_ruta: ["operaciones"],
  completado: [],
  cancelado: [],
};

/** Tareas que se generan al entrar en cada estado (títulos = claves i18n) */
const TAREAS_POR_ESTADO: Partial<Record<EstadoExpediente, { rol: Rol; titulo: string }[]>> = {
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
};

let contadorTarea = 0;
function nuevaTareaId(): string {
  contadorTarea += 1;
  return `t${Date.now()}_${contadorTarea}`;
}

export function tareasParaEstado(estado: EstadoExpediente): TareaExpediente[] {
  return (TAREAS_POR_ESTADO[estado] ?? []).map((t) => ({
    id: nuevaTareaId(),
    rolResponsable: t.rol,
    titulo: t.titulo,
    estado: "pendiente",
    paso: estado,
  }));
}

export function siguienteEstado(estado: EstadoExpediente): EstadoExpediente | null {
  const i = ORDEN_ESTADOS.indexOf(estado);
  if (i < 0 || i === ORDEN_ESTADOS.length - 1) return null;
  return ORDEN_ESTADOS[i + 1];
}

export function puedeAvanzar(expediente: Expediente, roles: Rol[]): boolean {
  if (expediente.estado === "completado" || expediente.estado === "cancelado") return false;
  if (roles.includes("admin") || roles.includes("direccion")) return true;
  return ROLES_TRANSICION[expediente.estado].some((r) => roles.includes(r));
}

/** Al avanzar: nuevas tareas del paso siguiente se añaden a las existentes */
export function avanzar(expediente: Expediente): Pick<Expediente, "estado" | "tareas"> | null {
  const destino = siguienteEstado(expediente.estado);
  if (!destino) return null;
  return {
    estado: destino,
    tareas: [...expediente.tareas, ...tareasParaEstado(destino)],
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
