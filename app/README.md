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

## Puesta en marcha en `digivend-dev` (primera vez)

En la consola de Firebase (una sola vez):

1. **Firestore**: Bases de datos → Crear base de datos → ubicación **`europe-west1`**, modo producción.
2. **Authentication**: Empezar → método **Correo electrónico/contraseña** → habilitar.
3. **App web**: Configuración del proyecto → Tus apps → icono `</>` → nombre "DIGIVEND" (sin Hosting automático). Copiar la config en `app/.env.local` (ver `.env.example`, con `VITE_USE_EMULATORS=false`).
4. **Plan Blaze**: necesario solo para las Cloud Functions (los correos). Hosting, Firestore y Auth funcionan en Spark.
5. **Clave de cuenta de servicio**: Configuración → Cuentas de servicio → Generar nueva clave privada → guardar como `serviceAccount.json` (está en `.gitignore`).

Desde `app/` con Node instalado:

```bash
npm install
npx firebase-tools login
npm run build
npx firebase-tools deploy --only firestore:rules,hosting          # + ,functions con Blaze

# Datos iniciales del tenant piloto
GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json npm run seed:catalogo -- --tenant=piloto --project=digivend-dev
GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json npm run seed:articulos -- --tenant=piloto --project=digivend-dev

# Primer administrador (crea también el tenant y sus claims)
node scripts/crear-usuario.mjs --project=digivend-dev --sa=serviceAccount.json \
  --tenant=piloto --nombre-tenant="Piloto" --email=admin@ejemplo.com --password=CambiaEsto1 --roles=admin

# Imágenes de producto (desde el PC con la carpeta local)
node scripts/subir-imagenes.mjs --tenant=piloto --project=digivend-dev \
  --dir="C:\...\Vencloud\Imagenes\Productos" --sa=serviceAccount.json
```

## Build y despliegue (habitual)

```bash
npm run build       # tsc + vite build → dist/
npx firebase-tools deploy --only hosting,firestore:rules,functions
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
