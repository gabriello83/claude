// Tests de plantillas de correo (D7): render de variables y cobertura de los
// 8 tipos en los 4 idiomas del producto.

import { describe, expect, it, vi } from "vitest";

// correos.ts inicializa Firebase al importarse; en tests lo sustituimos
vi.mock("@/lib/firebase", () => ({ db: {} }));

const { renderPlantilla, plantillaDefecto, VARIABLES_CORREO } = await import("@/lib/correos");

const TIPOS = Object.keys(VARIABLES_CORREO) as (keyof typeof VARIABLES_CORREO)[];
const IDIOMAS = ["es", "en", "it", "fr"] as const;

describe("renderPlantilla", () => {
  it("sustituye las variables del contexto", () => {
    expect(
      renderPlantilla("Instalación en {{cliente}}, {{direccion}}", {
        cliente: "SERUNION, SA",
        direccion: "C/ Mayor 1",
      }),
    ).toBe("Instalación en SERUNION, SA, C/ Mayor 1");
  });

  it("deja visibles las variables sin valor para que el operador las detecte", () => {
    expect(renderPlantilla("Hola {{nombre}}", {})).toBe("Hola {{nombre}}");
  });

  it("sustituye la misma variable repetida", () => {
    expect(renderPlantilla("{{a}} y {{a}}", { a: "x" })).toBe("x y x");
  });
});

describe("plantillas por defecto (D7)", () => {
  it("existen los 8 tipos de correo en los 4 idiomas, con asunto y cuerpo", () => {
    for (const idioma of IDIOMAS) {
      for (const tipo of TIPOS) {
        const p = plantillaDefecto(idioma, tipo);
        expect(p.asunto.length, `${idioma}/${tipo} asunto`).toBeGreaterThan(5);
        expect(p.cuerpo.length, `${idioma}/${tipo} cuerpo`).toBeGreaterThan(10);
      }
    }
  });

  it("cada plantilla usa solo variables declaradas para su tipo", () => {
    for (const idioma of IDIOMAS) {
      for (const tipo of TIPOS) {
        const p = plantillaDefecto(idioma, tipo);
        const usadas = [...`${p.asunto} ${p.cuerpo}`.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
        for (const v of usadas) {
          expect(VARIABLES_CORREO[tipo], `${idioma}/${tipo} usa {{${v}}}`).toContain(v);
        }
      }
    }
  });

  it("un idioma desconocido cae al español", () => {
    const p = plantillaDefecto("xx" as never, "alta_ruta");
    expect(p.asunto).toContain("Alta en ruta");
  });
});
