// Tests del módulo de planogramas (D19): tipo de máquina y rejilla.

import { describe, expect, it } from "vitest";
import { esMaquinaDeCafe, mapaPosiciones, posicionKey } from "@/lib/planograma";
import type { ModeloMaquina, PosicionPlanograma } from "@/types/domain";

const modelo = (clase: string): ModeloMaquina => ({
  id: "m1",
  codigo: "C0001",
  clase,
  marca: "NECTA",
  modelo: "OPERA",
  formato: 1,
  canales: 20,
  filas: 10,
  columnas: 2,
  canalesExtra: 0,
  contenedores: 10,
});

describe("clasificación de máquinas del catálogo real (D27)", () => {
  it("las de bebidas calientes y OCS se configuran por selecciones", () => {
    expect(esMaquinaDeCafe(modelo("Bebidas Calientes/Preparadas"))).toBe(true);
    expect(esMaquinaDeCafe(modelo("OCS/Café Capsula-Grano"))).toBe(true);
  });

  it("snack, frías y mixtas usan la rejilla de espirales", () => {
    expect(esMaquinaDeCafe(modelo("Snack/Multiproducto"))).toBe(false);
    expect(esMaquinaDeCafe(modelo("Bebidas Frías/Envasadas"))).toBe(false);
    expect(esMaquinaDeCafe(modelo("Combi - Mixtas (Caliente - Frío)"))).toBe(false);
  });
});

describe("rejilla de posiciones", () => {
  it("indexa por bandeja-espiral sin colisiones", () => {
    const posiciones: PosicionPlanograma[] = [
      { bandeja: 1, espiral: 2, tipoEspiral: "simple", productoId: "A" },
      { bandeja: 12, espiral: 1, tipoEspiral: "doble", productoId: "B" },
    ];
    const mapa = mapaPosiciones(posiciones);
    expect(mapa.get(posicionKey(1, 2))?.productoId).toBe("A");
    expect(mapa.get(posicionKey(12, 1))?.productoId).toBe("B");
    // bandeja 12 espiral 1 NO debe chocar con bandeja 1 espiral 21
    expect(posicionKey(12, 1)).not.toBe(posicionKey(1, 21));
  });
});
