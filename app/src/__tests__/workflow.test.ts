// Tests del motor de workflow (D6, D22): simulan el ciclo de vida real de
// cada tipo de expediente tal y como lo recorrería un operador de vending.

import { describe, expect, it } from "vitest";
import {
  FLUJOS,
  avanzar,
  costeTotal,
  excesoInversion,
  flujoDe,
  puedeAvanzar,
  siguienteEstado,
  tareasParaEstado,
} from "@/lib/workflow";
import type { Expediente } from "@/types/domain";

function expedienteBase(patch: Partial<Expediente> = {}): Expediente {
  return {
    id: "e1",
    clienteId: "c1",
    clienteNombre: "HOSPITAL DE PRUEBA",
    delegacionId: "d1",
    delegacionNombre: "Madrid - Leganés",
    tipo: "instalacion",
    tipoOferta: "privada",
    estado: "registrado",
    canon: { tipo: "sin_canon" },
    condicionesEspeciales: [],
    propuestaInversion: null,
    lineasCoste: [],
    tareas: tareasParaEstado("instalacion", "registrado"),
    instalacion: {},
    creadoPor: "tester@vending.es",
    creadoEn: new Date().toISOString(),
    ...patch,
  };
}

describe("flujo de instalación completo", () => {
  it("recorre los 6 pasos acumulando tareas de cada departamento", () => {
    let exp = expedienteBase();
    // Paso 1: al registrar, administración recibe la pregunta de inversión (D25)
    expect(exp.tareas.some((t) => t.titulo === "tareas.responderInversion")).toBe(true);
    expect(exp.tareas.find((t) => t.titulo === "tareas.responderInversion")?.rolResponsable).toBe(
      "administracion",
    );

    const esperados = [
      "preparacion_tecnica",
      "alta_administrativa",
      "instalacion",
      "alta_en_ruta",
      "completado",
    ];
    for (const destino of esperados) {
      const cambio = avanzar(exp);
      expect(cambio).not.toBeNull();
      exp = { ...exp, ...cambio! };
      expect(exp.estado).toBe(destino);
    }
    // Desde completado no se puede avanzar más
    expect(avanzar(exp)).toBeNull();
    // El técnico acumuló sus tareas de preparación e instalación
    const rolesTareas = exp.tareas.map((t) => t.rolResponsable);
    expect(rolesTareas).toContain("tecnico");
    expect(rolesTareas).toContain("operaciones");
    expect(exp.tareas.some((t) => t.titulo === "tareas.pedirCambio")).toBe(true);
    expect(exp.tareas.some((t) => t.titulo === "tareas.enviarAltaRuta")).toBe(true);
  });
});

describe("flujos por tipo de expediente (D22)", () => {
  it("la retirada no pasa por preparación técnica ni alta administrativa", () => {
    expect(FLUJOS.retirada).toEqual(["registrado", "ejecucion", "alta_en_ruta", "completado"]);
  });

  it("cambio de planograma y subida de precios terminan tras la ejecución", () => {
    expect(FLUJOS.cambio_planograma.at(-2)).toBe("ejecucion");
    expect(FLUJOS.subida_precios.at(-2)).toBe("ejecucion");
  });

  it("todos los flujos empiezan en registrado y acaban en completado", () => {
    for (const flujo of Object.values(FLUJOS)) {
      expect(flujo[0]).toBe("registrado");
      expect(flujo.at(-1)).toBe("completado");
    }
  });

  it("un tipo desconocido cae al flujo de instalación", () => {
    const exp = expedienteBase({ tipo: "inexistente" as never });
    expect(flujoDe(exp)).toEqual(FLUJOS.instalacion);
  });

  it("la subida de precios pide crear la revisión de tarifa", () => {
    const tareas = tareasParaEstado("subida_precios", "preparacion_tecnica");
    expect(tareas.some((t) => t.titulo === "tareas.nuevaTarifa")).toBe(true);
  });
});

describe("permisos de transición por rol (D17)", () => {
  it("el comercial avanza desde registrado pero no desde alta administrativa", () => {
    expect(puedeAvanzar(expedienteBase(), ["comercial"])).toBe(true);
    expect(
      puedeAvanzar(expedienteBase({ estado: "alta_administrativa" }), ["comercial"]),
    ).toBe(false);
  });

  it("administración avanza el alta administrativa; operaciones el alta en ruta", () => {
    expect(
      puedeAvanzar(expedienteBase({ estado: "alta_administrativa" }), ["administracion"]),
    ).toBe(true);
    expect(puedeAvanzar(expedienteBase({ estado: "alta_en_ruta" }), ["operaciones"])).toBe(true);
    expect(puedeAvanzar(expedienteBase({ estado: "alta_en_ruta" }), ["tecnico"])).toBe(false);
  });

  it("dirección y admin pueden avanzar cualquier paso (D17)", () => {
    for (const estado of FLUJOS.instalacion.slice(0, -1)) {
      expect(puedeAvanzar(expedienteBase({ estado }), ["direccion"])).toBe(true);
      expect(puedeAvanzar(expedienteBase({ estado }), ["admin"])).toBe(true);
    }
  });

  it("nadie avanza un expediente completado o cancelado", () => {
    expect(puedeAvanzar(expedienteBase({ estado: "completado" }), ["admin"])).toBe(false);
    expect(puedeAvanzar(expedienteBase({ estado: "cancelado" }), ["direccion"])).toBe(false);
  });

  it("un usuario multi-rol hereda los permisos de todos sus roles (q8)", () => {
    const exp = expedienteBase({ estado: "preparacion_tecnica" });
    expect(puedeAvanzar(exp, ["comercial", "tecnico"])).toBe(true);
  });
});

describe("control de inversión (D25)", () => {
  it("suma las líneas de coste de máquinas, periféricos y equipamiento", () => {
    const exp = expedienteBase({
      lineasCoste: [
        { tipo: "maquina", concepto: "NECTA OPERA", importe: 3500 },
        { tipo: "periferico", concepto: "Monedero", importe: 250 },
        { tipo: "equipamiento", concepto: "Microondas", importe: 89.9 },
      ],
    });
    expect(costeTotal(exp)).toBeCloseTo(3839.9, 2);
  });

  it("sin propuesta de inversión no hay exceso que avisar", () => {
    const exp = expedienteBase({
      lineasCoste: [{ tipo: "maquina", concepto: "X", importe: 99999 }],
    });
    expect(excesoInversion(exp)).toBeNull();
    expect(
      excesoInversion(expedienteBase({ propuestaInversion: { existe: false } })),
    ).toBeNull();
  });

  it("detecta el exceso exacto sobre la propuesta y no avisa por debajo", () => {
    const conPropuesta = (importeCoste: number) =>
      expedienteBase({
        propuestaInversion: { existe: true, importe: 5000 },
        lineasCoste: [{ tipo: "maquina", concepto: "X", importe: importeCoste }],
      });
    expect(excesoInversion(conPropuesta(4999))).toBeNull();
    expect(excesoInversion(conPropuesta(5000))).toBeNull();
    expect(excesoInversion(conPropuesta(5750))).toBe(750);
  });
});

describe("consistencia estados/tareas", () => {
  it("cada estado con tareas pertenece al flujo de su tipo", () => {
    for (const [tipo, flujo] of Object.entries(FLUJOS)) {
      for (const estado of flujo) {
        const tareas = tareasParaEstado(tipo as keyof typeof FLUJOS, estado);
        for (const tarea of tareas) expect(tarea.paso).toBe(estado);
        for (const tarea of tareas) expect(tarea.estado).toBe("pendiente");
      }
    }
  });

  it("los IDs de tarea generados son únicos", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      for (const tarea of tareasParaEstado("instalacion", "preparacion_tecnica")) {
        expect(ids.has(tarea.id)).toBe(false);
        ids.add(tarea.id);
      }
    }
  });

  it("siguienteEstado respeta el flujo del tipo", () => {
    expect(siguienteEstado(expedienteBase({ tipo: "retirada" }))).toBe("ejecucion");
    expect(
      siguienteEstado(expedienteBase({ tipo: "cambio_planograma", estado: "ejecucion" })),
    ).toBe("completado");
  });
});
