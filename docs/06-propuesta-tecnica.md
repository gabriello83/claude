# Propuesta técnica — DIGIVEND v1

Basada en las decisiones D1–D28 y en la información del proyecto Firebase
existente (`05-accesos-firebase.md`).

## 1. Plataforma: Firebase, en proyecto separado

DIGIVEND se construye sobre **Firebase/Google Cloud, región `europe-west1`**
(la misma que "Serunion Vending APP"), pero en **proyectos propios**:

- `digivend-dev` (desarrollo/pruebas) y `digivend-prod` (producción).
- **Por qué separado del proyecto `vending-care-tracker`**: DIGIVEND es un
  SaaS multi-tenant que se venderá a varios operadores (D1); no debe compartir
  base de datos, reglas ni facturación con las apps internas de un operador
  concreto. La integración con "Visitas comerciales" se hace **entre
  proyectos** (ver §6), no compartiendo proyecto.

## 2. Stack

| Capa | Elección | Motivo |
|---|---|---|
| Frontend | SPA **React + TypeScript**, servida como **PWA** desde Firebase Hosting | D4 (web responsive/PWA); tipado fuerte para un dominio con muchas entidades |
| UI / i18n | Librería de componentes + **i18next** (ES/EN/IT/FR) | D7; textos externalizados desde el día 1 |
| Base de datos | **Cloud Firestore** (nativo, `europe-west1`) | Mismo modelo que las apps existentes; tiempo real para tareas/paneles |
| Backend | **Cloud Functions 2ª gen (Node.js/TypeScript)** | Correos, PDF, import Excel, lógica de workflow que no puede confiarse al cliente |
| Ficheros | **Firebase Storage** | Hojas de taller PDF, Excel importados, adjuntos de correos |
| Autenticación | **Firebase Auth email/contraseña** + *custom claims* (`tenantId`, `roles[]`) | D24 (sin SSO); multi-rol D17 |
| Seguridad | **Reglas de Firestore/Storage por tenant** + **App Check** | Aislamiento estricto multi-tenant (D1) |
| Correo | Cola `mail` en Firestore procesada por Function con **SMTP configurable por tenant** (Nodemailer) | Mismo patrón *Trigger Email* que ya usa Visitas Comerciales, pero por tenant: cada operador envía desde su propio SMTP/M365/Google (q39) |
| PDF | Function con plantillas HTML → PDF (Puppeteer/Chromium) | Hoja de taller, planograma de fábrica, orden de instalación |
| Excel | Function con SheetJS para validar e importar la plantilla (D8) y las migraciones (D24) | Validación fila a fila en servidor |
| CI/CD | GitHub Actions → Firebase Hosting/Functions (dev en cada merge, prod con aprobación) | Repo ya en GitHub |

## 3. Modelo multi-tenant en Firestore

Todo dato de negocio vive bajo el tenant:

```
/tenants/{tenantId}
  /config          (idioma, direcciones de correo por tipo, SMTP, licencias de módulos)
  /usuarios        (perfil + roles; el login es Firebase Auth con claim tenantId)
  /fabricantes, /modelosMaquina   (catálogo, importado del Excel D27)
  /productos, /seleccionesCafe
  /clientes/{clienteId}
    /expedientes/{expedienteId}   (tipo, estado, tareas[], canon, propuestaInversion,
                                   lineasCoste[], condicionesEspeciales[])
      /maquinas    (modelo, nueva/usada, nºserie, monedero, contador, periféricos, telemetría)
      /equipamiento (mueble/panelado/microondas/fuente, proveedor, coste, estado solicitud)
      /planogramas (posiciones bandeja×espiral, tipo simple/doble/triple)
      /correos     (histórico de envíos con cuerpo y adjuntos)
  /tarifas         (vigencias, líneas, franjas/colectivos, revisiones IPC D20)
  /plantillasCorreo, /plantillasPlanograma
  /auditoria       (append-only: quién, qué, cuándo)
/mail              (cola global de salida; cada doc referencia tenant y SMTP a usar)
```

Las **reglas de seguridad** validan `request.auth.token.tenantId == tenantId`
en cada ruta y los roles por operación; Dirección tiene lectura transversal
dentro de su tenant (D17). El **módulo planograma** se activa por licencia en
`/config` (D19). Cálculos sensibles (costes vs propuesta de inversión D25,
transiciones de workflow, envío de correos) van por Functions, nunca por
escritura directa del cliente.

## 4. Workflow y correos

- Motor de workflow **fijo** (D6) implementado como máquina de estados en
  Functions: cada transición valida el rol, crea las tareas del paso siguiente,
  escribe auditoría y encola los correos que tocan.
- Recordatorios de tareas por correo (D23) mediante Function programada
  (Cloud Scheduler) que revisa fechas límite.
- Los 8 tipos de correo (diseño funcional §6) son plantillas Handlebars por
  tenant con variables; los adjuntos (PDF) se generan y guardan en Storage y
  se enlazan/adjuntan al envío.
- Aviso de **exceso de inversión** (D25): trigger en Firestore al añadir una
  línea de coste recalcula el acumulado y notifica a Dirección/Administración.

## 5. Módulo planograma (licenciable, D19)

- Editor visual (rejilla filas × columnas del catálogo D27; máquinas de café
  con canales + contenedores) como paquete de frontend activado por licencia.
- Genera: hoja de preparación de taller (PDF), planograma de fábrica para el
  fabricante (PDF con tipos de espiral y huecos) y hojas de cambio
  (workflows de cambio de planograma / subida de precios, D22).
- Reglas de creación de planogramas: pendientes de definir con el cliente;
  el motor las aplicará como validaciones configurables.

## 6. Integración con "Visitas comerciales" (checklist de instalación)

El proyecto `vending-care-tracker` ya registra visitas con fotos y averías por
matrícula. Propuesta en dos fases:

1. **v1**: enlace débil — el expediente DIGIVEND guarda la referencia
   (delegación + matrícula/centro) y un enlace profundo a la visita; una
   **cuenta de servicio de solo lectura** entre proyectos permite mostrar en
   DIGIVEND el checklist y las fotos de la instalación sin duplicarlos.
2. **v2**: la app Visitas Comerciales escribe el resultado del checklist
   directamente en el expediente DIGIVEND vía Function HTTP autenticada.

## 7. Recomendaciones sobre el proyecto existente

1. **Activar copias de seguridad programadas** de Firestore en
   `vending-care-tracker` (hoy: inhabilitadas) — datos operativos reales.
2. Revisar **reglas de seguridad** de Firestore/Storage (la apiKey es pública
   por diseño; las reglas son la única barrera) y confirmar App Check activo
   en las dos apps web.
3. La colección `logs` guarda errores con emails de usuarios: valorar
   retención/limpieza por RGPD.

## 8. Plan de fases de la v1

| Fase | Contenido | Resultado demostrable |
|---|---|---|
| F1 — Fundaciones | Proyectos Firebase, CI/CD, auth multi-tenant con roles, i18n, configuración del tenant (correos, SMTP, plantillas), import del catálogo de modelos (D27) | Login por tenant, catálogo navegable |
| F2 — Expedientes y workflow | Clientes, oferta ganada, canon, condiciones especiales, equipamiento, propuesta de inversión, máquina de estados, tareas y panel | Workflow de instalación completo sin planograma |
| F3 — Correos y PDF | Los 8 correos con plantillas y direcciones configurables, cola `mail` por tenant, PDFs de orden y hoja de taller | Instalación coordinada por correo de punta a punta |
| F4 — Tarifas | Plantilla Excel, import validado, franjas/colectivos, vigencias e IPC (D20), migración inicial desde Excel | Tarifas del piloto cargadas |
| F5 — Planograma | Editor visual licenciable, plantillas, hojas de taller/fábrica/cambio | Módulo planograma vendible |
| F6 — Otros workflows + piloto | Retirada, sustitución, cambio planograma, subida precios (D22); integración lectura Visitas Comerciales; despliegue con el operador piloto | v1 en producción con el piloto |

Sin plazo cerrado (D16): cada fase se entrega y valida con el piloto antes de
seguir.
