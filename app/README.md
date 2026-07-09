# DIGIVEND — aplicación web (Fase 1)

SPA React + TypeScript servida como PWA desde Firebase Hosting. Multi-tenant:
todo dato de negocio vive bajo `/tenants/{tenantId}/...` y el usuario lleva
`tenantId` y `roles[]` como *custom claims* (ver `docs/06-propuesta-tecnica.md`).

## Desarrollo local

```bash
cd app
npm install
cp .env.example .env.local          # VITE_USE_EMULATORS=true para trabajar en local
firebase emulators:start &          # Auth + Firestore (requiere firebase-tools)
npm run dev
```

Carga del catálogo de modelos (202 tipos, `data/catalogo_tipos_maquina.csv`):

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:catalogo -- --tenant=piloto
```

Para crear un usuario de prueba en el emulador: consola de emuladores
(http://127.0.0.1:4000) → Authentication → añadir usuario, y asignar los
claims `{"tenantId": "piloto", "roles": ["admin"]}`.

## Puesta en marcha en `digivend-dev` desde Cloud Shell (primera vez)

En la consola de Firebase (una sola vez):

1. **Firestore**: Bases de datos → Crear base de datos → ubicación **`europe-west1`**, modo producción.
2. **Authentication**: Empezar → método **Correo electrónico/contraseña** → habilitar.
3. **App web**: Configuración del proyecto → Tus apps → icono `</>` → nombre "DIGIVEND". Copiar la config para el `.env.local` de abajo.
4. **Plan Blaze**: necesario solo para las Cloud Functions (los correos). Hosting, Firestore y Auth funcionan en Spark.

En [Cloud Shell](https://shell.cloud.google.com) (trae Node, git y firebase-tools ya autenticados con tu cuenta):

```bash
git clone https://github.com/gabriello83/claude.git
cd claude
git checkout claude/vending-installation-workflow-4quvg1
cd app
npm install
gcloud config set project digivend-dev

# Config de la app web (valores del paso 3 de la consola)
cp .env.example .env.local && nano .env.local     # VITE_USE_EMULATORS=false

npm run build
firebase deploy --only firestore:rules,hosting    # + ,functions con Blaze
# (si firebase pide login: firebase login --no-localhost)

# Datos iniciales del tenant piloto (usa las credenciales automáticas de Cloud Shell)
npm run seed:catalogo -- --tenant=piloto --project=digivend-dev
npm run seed:articulos -- --tenant=piloto --project=digivend-dev

# Primer administrador (crea también el tenant y sus claims)
node scripts/crear-usuario.mjs --project=digivend-dev \
  --tenant=piloto --nombre-tenant="Piloto" --email=admin@ejemplo.com \
  --password=CambiaEsto1 --roles=admin

# Imágenes de producto: subir el ZIP con el botón ⋮ → "Subir" de Cloud Shell y
unzip Productos.zip -d ~/imagenes
node scripts/subir-imagenes.mjs --tenant=piloto --project=digivend-dev --dir=~/imagenes
```

La app queda en `https://digivend-dev.web.app`.

## Build y despliegue (habitual)

```bash
npm run build       # tsc + vite build → dist/
firebase deploy --only hosting,firestore:rules,functions
```

## Estructura

- `src/types/domain.ts` — modelo de dominio (decisiones D1–D28)
- `src/auth/` — sesión, tenant y roles desde custom claims
- `src/i18n/` — ES / EN / IT / FR (D7)
- `src/pages/` — Login, Panel, Catálogo (Fase 1)
- `firestore.rules` — aislamiento por tenant y permisos por rol
- `scripts/seed-catalogo.mjs` — import del catálogo (D27)

## Estado de las fases (`docs/06-propuesta-tecnica.md §8`)

- ✅ F1 Fundaciones: auth multi-tenant, i18n ES/EN/IT/FR, catálogo (202 modelos)
- ✅ F2 Expedientes y workflow: oferta ganada, tareas por rol, propuesta de inversión
- ✅ F3 Correos: plantillas por tenant, cola `/tenants/{t}/mail` + Functions SMTP
- ✅ F4 Tarifas: plantilla Excel, import validado, 4 precios por canal, revisiones IPC
- ✅ F5 Planogramas (módulo licenciable): editor visual, plantillas, hojas imprimibles
- ✅ F6 Workflows de retirada, sustitución, cambio de planograma y subida de precios
- ⏳ Despliegue: crear proyectos `digivend-dev`/`digivend-prod` y pilotar
