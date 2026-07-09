// Módulo de planogramas (D19, licenciable por separado): utilidades de rejilla
// e impresión. La hoja de taller y el planograma de fábrica se generan como
// HTML imprimible (el navegador los convierte en PDF), sin depender de
// servicios externos.

import type {
  CondicionEspecial,
  MaquinaExpediente,
  ModeloMaquina,
  Planograma,
  PosicionPlanograma,
} from "@/types/domain";

/** Las máquinas de bebidas calientes se configuran por selecciones, no por espirales */
export function esMaquinaDeCafe(modelo: ModeloMaquina): boolean {
  return /calientes|ocs/i.test(modelo.clase);
}

export function posicionKey(bandeja: number, espiral: number): string {
  return `${bandeja}-${espiral}`;
}

export function mapaPosiciones(
  posiciones: PosicionPlanograma[],
): Map<string, PosicionPlanograma> {
  return new Map(posiciones.map((p) => [posicionKey(p.bandeja, p.espiral), p]));
}

// ---- Impresión ----

function abrirImpresion(titulo: string, cuerpoHtml: string): void {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${titulo}</title>
<style>
  body { font-family: system-ui, sans-serif; color: #111; margin: 2rem; }
  h1 { font-size: 1.3rem; } h2 { font-size: 1.05rem; margin-top: 1.2rem; }
  table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
  th, td { border: 1px solid #999; padding: 0.3rem 0.5rem; text-align: left; }
  th { background: #eee; }
  .meta { color: #444; font-size: 0.9rem; }
  @media print { button { display: none; } }
</style></head>
<body>${cuerpoHtml}
<script>window.onload = () => window.print();</script>
</body></html>`);
  win.document.close();
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface DatosHoja {
  clienteNombre: string;
  modelo: ModeloMaquina;
  maquina: MaquinaExpediente;
  planograma: Planograma;
  condiciones: CondicionEspecial[];
  /** Etiquetas ya traducidas (idioma del operador, D7) */
  et: Record<string, string>;
  nombreProducto: (codigo: string) => string;
  moneda: (n: number) => string;
}

/** Hoja de preparación de taller (q24): qué bandejas/espirales montar */
export function imprimirHojaTaller(d: DatosHoja): void {
  const filasPos = d.planograma.posiciones
    .filter((p) => p.productoId || p.precio !== undefined)
    .sort((a, b) => a.bandeja - b.bandeja || a.espiral - b.espiral)
    .map(
      (p) => `<tr>
<td>${p.bandeja}</td><td>${p.espiral}</td><td>${esc(d.et[`espiral_${p.tipoEspiral}`] ?? p.tipoEspiral)}</td>
<td>${p.productoId ? esc(`${p.productoId} — ${d.nombreProducto(p.productoId)}`) : "—"}</td>
<td>${p.capacidad ?? ""}</td><td>${p.precio !== undefined ? d.moneda(p.precio) : ""}</td></tr>`,
    )
    .join("");

  const filasSel = d.planograma.selecciones
    .map(
      (s) =>
        `<tr><td>${s.numero}</td><td>${esc(s.nombre)}</td><td>${d.moneda(s.precio)}</td></tr>`,
    )
    .join("");

  const perifericos = d.maquina.perifericos.map((p) => d.et[`perif_${p}`] ?? p).join(", ");
  const condiciones = d.condiciones
    .map((c) => `<li>${esc(d.et[`cond_${c.tipo}`] ?? c.tipo)}${c.descripcion ? ` — ${esc(c.descripcion)}` : ""}</li>`)
    .join("");

  abrirImpresion(
    `${d.et.hojaTaller} — ${d.clienteNombre}`,
    `<h1>${d.et.hojaTaller}</h1>
<p class="meta"><strong>${esc(d.clienteNombre)}</strong> · ${esc(d.modelo.marca)} ${esc(d.modelo.modelo)} (${esc(d.modelo.codigo)})
${d.maquina.numeroSerie ? ` · S/N ${esc(d.maquina.numeroSerie)}` : ""} · ${new Date().toLocaleDateString()}</p>
${filasPos ? `<h2>${d.et.posiciones}</h2><table><tr><th>${d.et.bandeja}</th><th>${d.et.espiral}</th><th>${d.et.tipoEspiral}</th><th>${d.et.producto}</th><th>${d.et.capacidad}</th><th>${d.et.precio}</th></tr>${filasPos}</table>` : ""}
${filasSel ? `<h2>${d.et.selecciones}</h2><table><tr><th>Nº</th><th>${d.et.nombre}</th><th>${d.et.precio}</th></tr>${filasSel}</table>` : ""}
${perifericos ? `<h2>${d.et.perifericos}</h2><p>${esc(perifericos)}${d.maquina.telemetria.activa ? ` · ${d.et.telemetria}` : ""}</p>` : ""}
${condiciones ? `<h2>${d.et.condiciones}</h2><ul>${condiciones}</ul>` : ""}`,
  );
}

/** Planograma de fábrica (q25): solo tipos de espirales y huecos */
export function imprimirPlanogramaFabrica(d: DatosHoja): void {
  const porBandeja = new Map<number, PosicionPlanograma[]>();
  for (const p of d.planograma.posiciones) {
    if (!porBandeja.has(p.bandeja)) porBandeja.set(p.bandeja, []);
    porBandeja.get(p.bandeja)!.push(p);
  }
  const filas = [...porBandeja.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bandeja, posiciones]) => {
      const celdas = posiciones
        .sort((a, b) => a.espiral - b.espiral)
        .map((p) =>
          p.productoId
            ? `<td>${esc(d.et[`espiral_${p.tipoEspiral}`] ?? p.tipoEspiral)}</td>`
            : `<td style="background:#f2f2f2">${d.et.hueco}</td>`,
        )
        .join("");
      return `<tr><th>${d.et.bandeja} ${bandeja}</th>${celdas}</tr>`;
    })
    .join("");

  abrirImpresion(
    `${d.et.planogramaFabrica} — ${d.clienteNombre}`,
    `<h1>${d.et.planogramaFabrica}</h1>
<p class="meta"><strong>${esc(d.modelo.marca)} ${esc(d.modelo.modelo)}</strong> (${esc(d.modelo.codigo)}) · ${esc(d.clienteNombre)} · ${new Date().toLocaleDateString()}</p>
<table>${filas}</table>`,
  );
}
