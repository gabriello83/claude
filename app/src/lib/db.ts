// Acceso a datos del tenant. Los expedientes viven en
// /tenants/{tenantId}/expedientes (con el cliente en /clientes) para poder
// listarlos sin consultas de grupo; las máquinas y el equipamiento son
// subcolecciones del expediente.

import {
  collection,
  doc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { db } from "./firebase";
import { tareasParaEstado } from "./workflow";
import type {
  Cliente,
  Equipamiento,
  Expediente,
  LineaCoste,
  MaquinaExpediente,
} from "@/types/domain";

export const col = {
  clientes: (t: string) => collection(db, "tenants", t, "clientes"),
  expedientes: (t: string) => collection(db, "tenants", t, "expedientes"),
  expediente: (t: string, id: string) => doc(db, "tenants", t, "expedientes", id),
  maquinas: (t: string, e: string) =>
    collection(db, "tenants", t, "expedientes", e, "maquinas"),
  equipamiento: (t: string, e: string) =>
    collection(db, "tenants", t, "expedientes", e, "equipamiento"),
  modelosMaquina: (t: string) => collection(db, "tenants", t, "modelosMaquina"),
  productos: (t: string) => collection(db, "tenants", t, "productos"),
};

export interface NuevoExpedienteInput {
  /** Cliente nuevo (instalaciones)… */
  cliente?: Omit<Cliente, "id">;
  /** …o cliente ya existente (retiradas, sustituciones, cambios — D22) */
  clienteExistente?: { id: string; nombre: string };
  expediente: Omit<
    Expediente,
    "id" | "clienteId" | "clienteNombre" | "estado" | "tareas" | "lineasCoste" | "creadoEn"
  >;
  maquinas: Omit<MaquinaExpediente, "id">[];
  equipamiento: Omit<Equipamiento, "id">[];
}

/**
 * Registro del expediente (paso 1): crea cliente (si es nuevo) + expediente +
 * máquinas + equipamiento en un batch. El equipamiento genera automáticamente
 * sus líneas de coste para el control de inversión (D25/D26). Las tareas
 * iniciales dependen del tipo de expediente (D22).
 */
export async function crearExpediente(
  firestore: Firestore,
  tenantId: string,
  input: NuevoExpedienteInput,
): Promise<string> {
  const batch = writeBatch(firestore);

  let clienteId: string;
  let clienteNombre: string;
  if (input.clienteExistente) {
    clienteId = input.clienteExistente.id;
    clienteNombre = input.clienteExistente.nombre;
  } else if (input.cliente) {
    const clienteRef = doc(col.clientes(tenantId));
    batch.set(clienteRef, input.cliente);
    clienteId = clienteRef.id;
    clienteNombre = input.cliente.nombre;
  } else {
    throw new Error("Falta el cliente del expediente");
  }

  const lineasCoste: LineaCoste[] = input.equipamiento.map((eq) => ({
    tipo: "equipamiento",
    concepto: eq.descripcion || eq.tipo,
    proveedor: eq.proveedor,
    importe: eq.coste || 0,
  }));

  const expedienteRef = doc(col.expedientes(tenantId));
  const expediente: Omit<Expediente, "id"> = {
    ...input.expediente,
    clienteId,
    clienteNombre,
    estado: "registrado",
    tareas: tareasParaEstado(input.expediente.tipo, "registrado"),
    lineasCoste,
    creadoEn: new Date().toISOString(),
  };
  batch.set(expedienteRef, expediente);

  for (const m of input.maquinas) {
    batch.set(doc(col.maquinas(tenantId, expedienteRef.id)), m);
  }
  for (const eq of input.equipamiento) {
    batch.set(doc(col.equipamiento(tenantId, expedienteRef.id)), eq);
  }

  await batch.commit();
  return expedienteRef.id;
}
