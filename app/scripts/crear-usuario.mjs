// Crea un usuario en Firebase Auth con sus custom claims (tenantId + roles),
// el documento del tenant (si no existe) y su perfil en /usuarios.
// Imprescindible para el primer administrador: los claims solo pueden
// asignarse con el Admin SDK, nunca desde la app.
//
// Uso desde Cloud Shell (credenciales automáticas, sin clave):
//   node scripts/crear-usuario.mjs --project=digivend-dev \
//     --tenant=piloto --nombre-tenant="Serunion Vending" --idioma=es \
//     --email=admin@operador.com --password=Secreta123 --nombre="Admin" --roles=admin
//
// Fuera de Cloud Shell, añadir --sa=serviceAccount.json.
// Roles válidos: admin, direccion, comercial, tecnico, administracion, operaciones
// (varios separados por coma: --roles=comercial,tecnico)

import { readFileSync } from "node:fs";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const i = a.indexOf("=");
    return [a.slice(2, i), a.slice(i + 1)];
  }),
);

const { project, sa, tenant, email, password } = args;
if (!project || !tenant || !email || !password) {
  console.error(
    "Uso: node scripts/crear-usuario.mjs --project=... --tenant=... --email=... --password=... [--sa=serviceAccount.json] [--roles=admin] [--nombre=...] [--nombre-tenant=...] [--idioma=es]",
  );
  process.exit(1);
}

const ROLES_VALIDOS = ["admin", "direccion", "comercial", "tecnico", "administracion", "operaciones"];
const roles = (args.roles ?? "admin").split(",").map((r) => r.trim());
const invalidos = roles.filter((r) => !ROLES_VALIDOS.includes(r));
if (invalidos.length) {
  console.error(`Roles no válidos: ${invalidos.join(", ")}. Válidos: ${ROLES_VALIDOS.join(", ")}`);
  process.exit(1);
}

initializeApp({
  projectId: project,
  credential: sa ? cert(JSON.parse(readFileSync(sa, "utf8"))) : applicationDefault(),
});
const auth = getAuth();
const db = getFirestore();

// Usuario en Auth (o reutilizar si ya existe)
let user;
try {
  user = await auth.getUserByEmail(email);
  console.log(`El usuario ${email} ya existe (${user.uid}); se actualizan sus claims.`);
} catch {
  user = await auth.createUser({ email, password, displayName: args.nombre ?? email });
  console.log(`Usuario creado: ${email} (${user.uid})`);
}

await auth.setCustomUserClaims(user.uid, { tenantId: tenant, roles });
console.log(`Claims asignados: tenantId=${tenant}, roles=${roles.join(",")}`);

// Documento del tenant (merge: no pisa configuración existente)
await db.doc(`tenants/${tenant}`).set(
  {
    nombre: args["nombre-tenant"] ?? tenant,
    idioma: args.idioma ?? "es",
    modulos: { planograma: true },
  },
  { merge: true },
);

// Perfil del usuario en el tenant
await db.doc(`tenants/${tenant}/usuarios/${user.uid}`).set({
  email,
  nombre: args.nombre ?? email,
  roles,
  activo: true,
});

console.log(`Listo. Tenant "${tenant}" preparado y usuario dado de alta.`);
console.log("Nota: si el usuario ya tenía sesión abierta, debe salir y volver a entrar para refrescar los claims.");
