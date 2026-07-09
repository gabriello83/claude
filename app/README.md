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

## Build y despliegue

```bash
npm run build       # tsc + vite build → dist/
firebase deploy --only hosting,firestore:rules
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
