// Importa el catálogo de tipos de máquina (data/catalogo_tipos_maquina.csv,
// D27) en /tenants/{tenantId}/modelosMaquina.
//
// Uso:
//   Contra el emulador:  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:catalogo -- --tenant=piloto
//   Contra un proyecto:  GOOGLE_APPLICATION_CREDENTIALS=sa.json npm run seed:catalogo -- --tenant=piloto --project=digivend-dev

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")),
);
const tenantId = args.tenant;
if (!tenantId) {
  console.error("Falta --tenant=<tenantId>");
  process.exit(1);
}

const projectId =
  args.project ?? process.env.GCLOUD_PROJECT ?? (process.env.FIRESTORE_EMULATOR_HOST ? "digivend-dev" : undefined);
if (!projectId) {
  console.error("Falta --project=<projectId> (o FIRESTORE_EMULATOR_HOST para el emulador)");
  process.exit(1);
}

initializeApp({
  projectId,
  credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? cert(JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")))
    : applicationDefault(),
});
const db = getFirestore();

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, "../../data/catalogo_tipos_maquina.csv");
const lines = readFileSync(csvPath, "utf8").trim().split(/\r?\n/);
lines.shift(); // cabecera: Código,Clase,Marca-Modelo,Categoria,Formato,Canales,Filas,Columnas,Extra,Contenedores,Máquinas,PDVs

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

const num = (v) => {
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : 0;
};

let escritos = 0;
let batch = db.batch();
for (const line of lines) {
  const [codigo, clase, marcaModelo, , formato, canales, filas, columnas, extra, contenedores] =
    parseCsvLine(line);
  if (!codigo?.trim()) continue;

  // "NECTA - OPERA TOUCH 2 C" → marca "NECTA", modelo "OPERA TOUCH 2 C".
  // Algunos tipos vienen sin marca (" - DOCTOR COFFEE F2 PLUS").
  const [marca, ...resto] = marcaModelo.split(" - ");
  const doc = {
    codigo: codigo.trim(),
    clase: clase.trim(),
    marca: marca.trim(),
    modelo: resto.join(" - ").trim() || marca.trim(),
    formato: num(formato),
    canales: num(canales),
    filas: num(filas),
    columnas: num(columnas),
    canalesExtra: num(extra),
    contenedores: num(contenedores),
  };
  batch.set(db.doc(`tenants/${tenantId}/modelosMaquina/${doc.codigo}`), doc);
  escritos++;
  if (escritos % 400 === 0) {
    await batch.commit();
    batch = db.batch();
  }
}
await batch.commit();
console.log(`Importados ${escritos} modelos en tenants/${tenantId}/modelosMaquina (proyecto ${projectId})`);
