// Tarifas (D8, D20, D30): plantilla Excel descargable, import con validación
// fila a fila y revisiones por IPC. Cuatro precios por línea; el redondeo a
// 0,05 € se aplica únicamente al precio en efectivo.

import * as XLSX from "xlsx";
import type {
  ComboTarifa,
  CondicionEspecial,
  LineaTarifa,
  PreciosCanales,
  Tarifa,
  TipoCondicionEspecial,
} from "@/types/domain";

export const HOJAS = {
  productos: "Productos",
  selecciones: "Selecciones cafe",
  combos: "Combos",
  condiciones: "Condiciones",
} as const;

const CABECERA_PRECIOS = [
  "Precio efectivo",
  "Precio tarjeta empleado",
  "Precio tarjeta bancaria",
  "Precio aplicacion",
];

/** Redondeo a 0,05 € — solo para el precio en efectivo (D30) */
export function redondear005(x: number): number {
  return Math.round(Math.round(x / 0.05) * 0.05 * 100) / 100;
}

const esMultiplo005 = (x: number) => Math.abs(x * 100 - Math.round(x * 20) * 5) < 0.001;

// ---- Plantilla descargable ----

export function generarPlantilla(): Blob {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Codigo", "Nombre", ...CABECERA_PRECIOS, "Franja horaria", "Colectivo"],
      ["100321", "YOGUR FRESA S/LACTOSA 125G", 1.2, 1.1, 1.2, 1.15, "", ""],
    ]),
    HOJAS.productos,
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["N seleccion", "Nombre", ...CABECERA_PRECIOS, "Precio facturado al cliente"],
      [1, "Café solo", 0.5, 0.45, 0.5, 0.5, ""],
      [2, "Café con leche (gratis, facturado)", 0, 0, 0, 0, 0.4],
    ]),
    HOJAS.selecciones,
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Nombre", "Codigos (separados por +)", ...CABECERA_PRECIOS],
      ["Desayuno", "1+100321", 1.5, 1.4, 1.5, 1.45],
    ]),
    HOJAS.combos,
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Tipo", "Descripcion", "Valor"],
      ["gratuidad_diaria", "1 café gratis por empleado y día", ""],
    ]),
    HOJAS.condiciones,
  );

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// ---- Import con validación ----

export interface ResultadoImport {
  lineas: LineaTarifa[];
  combos: ComboTarifa[];
  condiciones: CondicionEspecial[];
  errores: string[];
  avisos: string[];
}

const TIPOS_CONDICION: TipoCondicionEspecial[] = [
  "cafe_facturado",
  "combo",
  "gratuidad_diaria",
  "dia_gratis_anual",
  "lote_navidad",
  "otro",
];

function leerPrecios(
  fila: unknown[],
  desde: number,
  donde: string,
  errores: string[],
  avisos: string[],
): PreciosCanales | null {
  const valores = [0, 1, 2, 3].map((i) => Number(fila[desde + i] ?? 0));
  if (valores.some((v) => Number.isNaN(v) || v < 0)) {
    errores.push(`${donde}: precio no válido`);
    return null;
  }
  if (!esMultiplo005(valores[0])) {
    avisos.push(`${donde}: el precio en efectivo ${valores[0]} no es múltiplo de 0,05 €`);
  }
  return {
    efectivo: valores[0],
    tarjetaEmpleado: valores[1],
    tarjetaBancaria: valores[2],
    app: valores[3],
  };
}

export async function importarExcel(
  file: File,
  catalogoProductos: Map<string, string>,
): Promise<ResultadoImport> {
  const wb = XLSX.read(await file.arrayBuffer());
  const errores: string[] = [];
  const avisos: string[] = [];
  const lineas: LineaTarifa[] = [];
  const combos: ComboTarifa[] = [];
  const condiciones: CondicionEspecial[] = [];

  const filas = (nombre: string): unknown[][] => {
    const ws = wb.Sheets[nombre];
    if (!ws) return [];
    const todas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
    return todas.slice(1).filter((f) => f.some((c) => c !== null && c !== undefined && c !== ""));
  };

  for (const [i, fila] of filas(HOJAS.productos).entries()) {
    const donde = `${HOJAS.productos} fila ${i + 2}`;
    const codigo = String(fila[0] ?? "").trim();
    if (!codigo) {
      errores.push(`${donde}: falta el código`);
      continue;
    }
    const nombreCatalogo = catalogoProductos.get(codigo);
    if (catalogoProductos.size > 0 && !nombreCatalogo) {
      errores.push(`${donde}: el código ${codigo} no existe en el catálogo de artículos`);
      continue;
    }
    const precios = leerPrecios(fila, 2, donde, errores, avisos);
    if (!precios) continue;
    lineas.push({
      tipo: "producto",
      codigo,
      nombre: nombreCatalogo ?? String(fila[1] ?? "").trim(),
      precios,
      ...(String(fila[6] ?? "").trim() ? { franjaHoraria: String(fila[6]).trim() } : {}),
      ...(String(fila[7] ?? "").trim() ? { colectivo: String(fila[7]).trim() } : {}),
    });
  }

  for (const [i, fila] of filas(HOJAS.selecciones).entries()) {
    const donde = `${HOJAS.selecciones} fila ${i + 2}`;
    const numero = String(fila[0] ?? "").trim();
    if (!numero) {
      errores.push(`${donde}: falta el nº de selección`);
      continue;
    }
    const precios = leerPrecios(fila, 2, donde, errores, avisos);
    if (!precios) continue;
    const facturado = Number(fila[6] ?? "");
    lineas.push({
      tipo: "seleccion",
      codigo: numero,
      nombre: String(fila[1] ?? "").trim(),
      precios,
      ...(fila[6] !== undefined && fila[6] !== "" && !Number.isNaN(facturado)
        ? { precioFacturadoCliente: facturado }
        : {}),
    });
  }

  for (const [i, fila] of filas(HOJAS.combos).entries()) {
    const donde = `${HOJAS.combos} fila ${i + 2}`;
    const nombre = String(fila[0] ?? "").trim();
    const codigos = String(fila[1] ?? "")
      .split("+")
      .map((c) => c.trim())
      .filter(Boolean);
    if (!nombre || codigos.length < 2) {
      errores.push(`${donde}: un combo necesita nombre y al menos 2 códigos separados por +`);
      continue;
    }
    const precios = leerPrecios(fila, 2, donde, errores, avisos);
    if (!precios) continue;
    combos.push({ nombre, codigos, precios });
  }

  for (const [i, fila] of filas(HOJAS.condiciones).entries()) {
    const donde = `${HOJAS.condiciones} fila ${i + 2}`;
    const tipoBruto = String(fila[0] ?? "").trim() as TipoCondicionEspecial;
    const tipo = TIPOS_CONDICION.includes(tipoBruto) ? tipoBruto : "otro";
    if (!TIPOS_CONDICION.includes(tipoBruto)) {
      avisos.push(`${donde}: tipo "${String(fila[0])}" no reconocido, se registra como "otro"`);
    }
    const valor = Number(fila[2] ?? "");
    condiciones.push({
      tipo,
      descripcion: String(fila[1] ?? "").trim(),
      ...(fila[2] !== undefined && fila[2] !== "" && !Number.isNaN(valor) ? { valor } : {}),
    });
  }

  if (lineas.length === 0 && errores.length === 0) {
    errores.push("El fichero no contiene ninguna línea de tarifa");
  }

  return { lineas, combos, condiciones, errores, avisos };
}

// ---- Revisión por IPC (D20) ----

export type ModoRevision = "fijo" | "porcentaje";

function subir(precio: number, modo: ModoRevision, valor: number): number {
  const nuevo = modo === "fijo" ? precio + valor : precio * (1 + valor / 100);
  return Math.round(nuevo * 100) / 100;
}

function subirPrecios(p: PreciosCanales, modo: ModoRevision, valor: number): PreciosCanales {
  return {
    // Solo el efectivo se redondea a 0,05 € (D30)
    efectivo: redondear005(subir(p.efectivo, modo, valor)),
    tarjetaEmpleado: subir(p.tarjetaEmpleado, modo, valor),
    tarjetaBancaria: subir(p.tarjetaBancaria, modo, valor),
    app: subir(p.app, modo, valor),
  };
}

export function aplicarRevision(
  tarifa: Tarifa,
  modo: ModoRevision,
  valor: number,
  vigenteDesde: string,
): Omit<Tarifa, "id"> {
  return {
    nombre: `${tarifa.nombre} — IPC ${modo === "fijo" ? `+${valor}€` : `+${valor}%`}`,
    ...(tarifa.clienteId ? { clienteId: tarifa.clienteId } : {}),
    ...(tarifa.clienteNombre ? { clienteNombre: tarifa.clienteNombre } : {}),
    vigenteDesde,
    lineas: tarifa.lineas.map((l) => ({
      ...l,
      precios: subirPrecios(l.precios, modo, valor),
    })),
    combos: tarifa.combos.map((c) => ({ ...c, precios: subirPrecios(c.precios, modo, valor) })),
    condiciones: tarifa.condiciones,
    revisionDe: tarifa.id,
    creadoEn: new Date().toISOString(),
  };
}
