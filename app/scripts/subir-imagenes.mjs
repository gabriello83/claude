// Sube las imágenes de producto desde una carpeta local a Firebase Storage
// con la convención tenants/{tenantId}/productos/{codigo}.{ext} y rellena
// el campo imagenPath del producto en Firestore (docs/07-catalogo-articulos.md).
//
// Uso desde Cloud Shell (credenciales automáticas): subir el ZIP de la carpeta
// de imágenes con el botón "Upload" de Cloud Shell, descomprimirlo y:
//
//   unzip Productos.zip -d ~/imagenes
//   node scripts/subir-imagenes.mjs --tenant=piloto --project=digivend-dev --dir=~/imagenes
//
// Fuera de Cloud Shell, añadir --sa=serviceAccount.json.
// Cada fichero debe llamarse como el código de artículo (100321.png, P0001.jpg…).
// Al final imprime un informe: subidas, sin producto en Firestore, y productos
// del catálogo que se quedaron sin imagen.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, basename } from "node:path";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")),
);
const { tenant: tenantId, project: projectId, dir, sa } = args;
if (!tenantId || !projectId || !dir) {
  console.error(
    "Uso: node scripts/subir-imagenes.mjs --tenant=<tenantId> --project=<projectId> --dir=<carpeta> [--sa=<serviceAccount.json>]",
  );
  process.exit(1);
}

const EXTENSIONES = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

initializeApp({
  projectId,
  credential: sa ? cert(JSON.parse(readFileSync(sa, "utf8"))) : applicationDefault(),
  storageBucket: args.bucket ?? `${projectId}.firebasestorage.app`,
});
const db = getFirestore();
const bucket = getStorage().bucket();

const snap = await db.collection(`tenants/${tenantId}/productos`).get();
const productos = new Map(snap.docs.map((d) => [d.id, d.ref]));
console.log(`Productos en Firestore: ${productos.size}`);

const ficheros = readdirSync(dir).filter(
  (f) => statSync(join(dir, f)).isFile() && EXTENSIONES.has(extname(f).toLowerCase()),
);
console.log(`Imágenes en la carpeta: ${ficheros.length}`);

const sinProducto = [];
const conImagen = new Set();
let subidas = 0;

for (const fichero of ficheros) {
  const ext = extname(fichero).toLowerCase();
  const codigo = basename(fichero, extname(fichero)).trim();
  const ref = productos.get(codigo);
  if (!ref) {
    sinProducto.push(fichero);
    continue;
  }
  const destino = `tenants/${tenantId}/productos/${codigo}${ext}`;
  await bucket.upload(join(dir, fichero), { destination: destino });
  await ref.update({ imagenPath: destino });
  conImagen.add(codigo);
  subidas++;
  if (subidas % 50 === 0) console.log(`  …${subidas} subidas`);
}

const sinImagen = [...productos.keys()].filter((c) => !conImagen.has(c));

console.log("\n=== INFORME ===");
console.log(`Subidas y enlazadas: ${subidas}`);
console.log(`Ficheros sin producto en el catálogo (${sinProducto.length}):`);
for (const f of sinProducto.slice(0, 30)) console.log("  -", f);
if (sinProducto.length > 30) console.log(`  … y ${sinProducto.length - 30} más`);
console.log(`Productos sin imagen (${sinImagen.length}):`);
for (const c of sinImagen.slice(0, 30)) console.log("  -", c);
if (sinImagen.length > 30) console.log(`  … y ${sinImagen.length - 30} más`);
