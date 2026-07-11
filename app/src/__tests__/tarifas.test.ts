// Tests del módulo de tarifas (D8, D20, D30): redondeo de efectivo a 0,05 €,
// revisiones IPC y validación del import Excel con casos reales de vending.

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  HOJAS,
  aplicarRevision,
  generarPlantilla,
  importarExcel,
  redondear005,
} from "@/lib/tarifas";
import type { Tarifa } from "@/types/domain";

describe("redondeo a 0,05 € (D30)", () => {
  it("redondea al múltiplo de 0,05 más cercano", () => {
    expect(redondear005(1.23)).toBe(1.25);
    expect(redondear005(1.22)).toBe(1.2);
    expect(redondear005(1.2)).toBe(1.2);
    expect(redondear005(0.98)).toBe(1.0);
    expect(redondear005(1.125)).toBe(1.15);
    expect(redondear005(0)).toBe(0);
  });
});

describe("revisión IPC (D20)", () => {
  const tarifa: Tarifa = {
    id: "t1",
    nombre: "Hospital 2026",
    vigenteDesde: "2026-01-01",
    lineas: [
      {
        tipo: "producto",
        codigo: "100321",
        nombre: "YOGUR",
        precios: { efectivo: 1.2, tarjetaEmpleado: 1.1, tarjetaBancaria: 1.2, app: 1.15 },
      },
      {
        tipo: "seleccion",
        codigo: "1",
        nombre: "Café solo",
        precios: { efectivo: 0.5, tarjetaEmpleado: 0.45, tarjetaBancaria: 0.5, app: 0.5 },
      },
    ],
    combos: [
      {
        nombre: "Desayuno",
        codigos: ["1", "100321"],
        precios: { efectivo: 1.5, tarjetaEmpleado: 1.4, tarjetaBancaria: 1.5, app: 1.45 },
      },
    ],
    condiciones: [{ tipo: "gratuidad_diaria", descripcion: "1 café/día" }],
    creadoEn: "2026-01-01T00:00:00Z",
  };

  it("subida del 3,5%: el efectivo se redondea a 0,05 y las tarjetas al céntimo", () => {
    const rev = aplicarRevision(tarifa, "porcentaje", 3.5, "2027-01-01");
    const yogur = rev.lineas[0].precios;
    // 1,20 € +3,5% = 1,242 → tarjeta al céntimo, efectivo a 0,05
    expect(yogur.efectivo).toBe(1.25);
    expect(yogur.tarjetaBancaria).toBe(1.24);
    expect(yogur.tarjetaEmpleado).toBe(1.14); // 1,10 → 1,1385 → 1,14
    expect(yogur.app).toBe(1.19); // 1,15 → 1,19025 → 1,19
  });

  it("subida fija de 0,03 €: solo el efectivo salta al múltiplo de 0,05", () => {
    const rev = aplicarRevision(tarifa, "fijo", 0.03, "2027-01-01");
    const cafe = rev.lineas[1].precios;
    expect(cafe.efectivo).toBe(0.55); // 0,53 → 0,55
    expect(cafe.tarjetaEmpleado).toBe(0.48); // exacto al céntimo
  });

  it("la revisión conserva combos, condiciones y enlaza con la tarifa origen", () => {
    const rev = aplicarRevision(tarifa, "porcentaje", 2, "2027-01-01");
    expect(rev.revisionDe).toBe("t1");
    expect(rev.vigenteDesde).toBe("2027-01-01");
    expect(rev.combos).toHaveLength(1);
    expect(rev.combos[0].precios.efectivo).toBe(1.55); // 1,53 → 1,55
    expect(rev.condiciones).toEqual(tarifa.condiciones);
    expect(rev.nombre).toContain("IPC");
  });
});

// Construye un "fichero" Excel en memoria como el que subiría el operador
function ficheroExcel(hojas: Record<string, unknown[][]>): File {
  const wb = XLSX.utils.book_new();
  for (const [nombre, filas] of Object.entries(hojas)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas), nombre);
  }
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([buf], "tarifa.xlsx");
}

const CATALOGO = new Map([
  ["100321", "YOGUR FRESA S/LACTOSA 125G"],
  ["10559", "ACTIMEL FRESA"],
]);

const CAB_PROD = ["Codigo", "Nombre", "E", "TE", "TB", "APP", "Franja", "Colectivo"];
const CAB_SEL = ["N", "Nombre", "E", "TE", "TB", "APP", "Facturado"];
const CAB_COMBO = ["Nombre", "Codigos", "E", "TE", "TB", "APP"];
const CAB_COND = ["Tipo", "Descripcion", "Valor"];

describe("import de Excel de tarifas (D8)", () => {
  it("importa productos, selecciones (café gratis facturado), combos y condiciones", async () => {
    const file = ficheroExcel({
      [HOJAS.productos]: [CAB_PROD, ["100321", "", 1.2, 1.1, 1.2, 1.15, "nocturna", "empleado"]],
      [HOJAS.selecciones]: [CAB_SEL, [1, "Café con leche", 0, 0, 0, 0, 0.4]],
      [HOJAS.combos]: [CAB_COMBO, ["Desayuno", "1+100321", 1.5, 1.4, 1.5, 1.45]],
      [HOJAS.condiciones]: [CAB_COND, ["lote_navidad", "Lote para 120 empleados", 25]],
    });
    const res = await importarExcel(file, CATALOGO);
    expect(res.errores).toEqual([]);
    expect(res.lineas).toHaveLength(2);
    // El nombre se toma del catálogo, no del Excel
    expect(res.lineas[0].nombre).toBe("YOGUR FRESA S/LACTOSA 125G");
    expect(res.lineas[0].franjaHoraria).toBe("nocturna");
    expect(res.lineas[0].colectivo).toBe("empleado");
    // Café gratuito para el usuario, facturado al cliente (D10)
    const cafe = res.lineas[1];
    expect(cafe.tipo).toBe("seleccion");
    expect(cafe.precios.efectivo).toBe(0);
    expect(cafe.precioFacturadoCliente).toBe(0.4);
    expect(res.combos[0].codigos).toEqual(["1", "100321"]);
    expect(res.condiciones[0]).toMatchObject({ tipo: "lote_navidad", valor: 25 });
  });

  it("rechaza códigos que no existen en el catálogo de artículos", async () => {
    const file = ficheroExcel({
      [HOJAS.productos]: [CAB_PROD, ["999999", "INVENTADO", 1, 1, 1, 1]],
    });
    const res = await importarExcel(file, CATALOGO);
    expect(res.errores.some((e) => e.includes("999999"))).toBe(true);
    expect(res.lineas).toHaveLength(0);
  });

  it("rechaza precios negativos y avisa si el efectivo no es múltiplo de 0,05", async () => {
    const file = ficheroExcel({
      [HOJAS.productos]: [
        CAB_PROD,
        ["100321", "", -1, 1, 1, 1], // error
        ["10559", "", 1.23, 1.2, 1.2, 1.2], // aviso (1,23 en efectivo)
      ],
    });
    const res = await importarExcel(file, CATALOGO);
    expect(res.errores).toHaveLength(1);
    expect(res.avisos.some((a) => a.includes("1.23"))).toBe(true);
    expect(res.lineas).toHaveLength(1); // solo la fila válida entra
  });

  it("un combo necesita al menos 2 códigos", async () => {
    const file = ficheroExcel({
      [HOJAS.productos]: [CAB_PROD, ["100321", "", 1.2, 1.1, 1.2, 1.15]],
      [HOJAS.combos]: [CAB_COMBO, ["Solo uno", "100321", 1, 1, 1, 1]],
    });
    const res = await importarExcel(file, CATALOGO);
    expect(res.errores.some((e) => e.includes("2 códigos"))).toBe(true);
  });

  it("una condición de tipo desconocido se registra como 'otro' con aviso", async () => {
    const file = ficheroExcel({
      [HOJAS.productos]: [CAB_PROD, ["100321", "", 1.2, 1.1, 1.2, 1.15]],
      [HOJAS.condiciones]: [CAB_COND, ["descuento_verano", "10% en julio", ""]],
    });
    const res = await importarExcel(file, CATALOGO);
    expect(res.condiciones[0].tipo).toBe("otro");
    expect(res.avisos.some((a) => a.includes("descuento_verano"))).toBe(true);
  });

  it("un fichero sin líneas de tarifa es un error", async () => {
    const file = ficheroExcel({ Otra: [["nada"]] });
    const res = await importarExcel(file, CATALOGO);
    expect(res.errores.some((e) => e.includes("ninguna línea"))).toBe(true);
  });

  it("la propia plantilla descargable se importa sin errores", async () => {
    const blob = generarPlantilla();
    const file = new File([await blob.arrayBuffer()], "plantilla.xlsx");
    // Con catálogo vacío no se validan códigos (migración inicial)
    const res = await importarExcel(file, new Map());
    expect(res.errores).toEqual([]);
    expect(res.lineas.length).toBeGreaterThan(0);
  });
});
