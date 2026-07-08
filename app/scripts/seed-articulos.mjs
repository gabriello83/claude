// Importa el catálogo de artículos (data/catalogo_articulos.csv, ver
// docs/07-catalogo-articulos.md) en /tenants/{tenantId}/productos.
//
// Uso:
//   Contra el emulador:  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:articulos -- --tenant=piloto
//   Contra un proyecto:  GOOGLE_APPLICATION_CREDENTIALS=sa.json npm run seed:articulos -- --tenant=piloto --project=digivend-dev

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
const csvPath = resolve(__dirname, "../../data/catalogo_articulos.csv");
const lines = readFileSync(csvPath, "utf8").trim().split(/\r?\n/);
lines.shift(); // Código,Nombre,Obsoleto,Fabricante,Categoría,Subcategoría,Categoría de precios

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

let escritos = 0;
let batch = db.batch();
for (const line of lines) {
  const [codigo, nombre, obsoleto, fabricante, categoria, subcategoria, categoriaPrecios] =
    parseCsvLine(line);
  if (!codigo?.trim()) continue;
  const doc = {
    codigo: codigo.trim(),
    nombre: nombre.trim(),
    obsoleto: obsoleto.trim().toLowerCase() === "true",
    fabricante: fabricante.trim(),
    categoria: categoria.trim(),
    subcategoria: subcategoria.trim(),
    categoriaPrecios: categoriaPrecios.trim() || null,
  };
  batch.set(db.doc(`tenants/${tenantId}/productos/${doc.codigo}`), doc);
  escritos++;
  if (escritos % 400 === 0) {
    await batch.commit();
    batch = db.batch();
  }
}
await batch.commit();
console.log(`Importados ${escritos} artículos en tenants/${tenantId}/productos (proyecto ${projectId})`);
