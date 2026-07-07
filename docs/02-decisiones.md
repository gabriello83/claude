# Decisiones de producto — v1

Decisiones tomadas con el cliente el 2026-07-07 sobre el cuestionario de
descubrimiento (`01-cuestionario-descubrimiento.md`).

| # | Tema | Decisión |
|---|---|---|
| D1 | Despliegue y modelo de negocio | **SaaS multi-tenant**: una plataforma en la nube, cada operador de vending es un tenant aislado, modelo de suscripción. |
| D2 | Alcance de la v1 | **MVP del workflow**: ofertas, máquinas, planograma con hoja de taller, import Excel de tarifas, canon, correos configurables y flujo Comercial → Técnico → Administración → Ruta. Facturación e integraciones en v2. |
| D3 | Integraciones en v1 | **Solo correo**: telemetría, monederos y sistemas de pago se registran como datos; toda la coordinación sale por correos con plantillas. Integraciones reales (telemetría, ERP, pagos) en v2. |
| D4 | Plataforma | **Web responsive / PWA**: una sola aplicación web usable en escritorio y móvil, instalable como PWA. Sin app nativa. |
| D5 | Planograma | **Editor visual con rejilla** (bandejas × espirales), asignación de productos con arrastrar y soltar, y hoja de preparación de taller en PDF para el servicio técnico. |
| D6 | Motor de workflow | **Flujo fijo en v1** (Comercial → Técnico → Administración → Ruta) con tareas, responsables y estados. El operador configura direcciones de correo, plantillas y roles; motor configurable en v2. |
| D7 | Idioma de correos y documentos | **Idioma del operador**: todos los correos y PDF salen en el idioma configurado por la empresa de vending (interfaz disponible en ES/EN/IT/FR). |
| D8 | Import de tarifas | **Plantilla Excel propia**, descargable desde la app (productos, selecciones de café, precios, combos, gratuidades), con validación de errores al subirla. |

## Preguntas aún abiertas (necesarias antes del diseño funcional)

Referencias al cuestionario `01-cuestionario-descubrimiento.md`:

1. **Fabricantes de máquinas a soportar de inicio** (p. 16): Necta/Evoca, Azkoyen,
   Jofemar, Bianchi, Rheavendors, Crane… y si se pueden obtener sus plantillas de
   bandejas para el editor visual.
2. **Roles y aprobaciones** (p. 6, 9): confirmar la lista de roles y si dirección
   debe aprobar ofertas por encima de un umbral.
3. **Detalle de gratuidades y combos** (p. 27–28): cómo se identifican los usuarios
   (llave, tarjeta, app) y a qué precio se factura el café gratuito al cliente.
4. **Canon variable** (p. 31–32): de dónde salen las cifras de ventas en v1 si no
   hay telemetría integrada (registro manual de recaudaciones).
5. **Maestro de rutas** (p. 43): si las rutas/reponedores/técnicos se mantienen en
   la app o solo se referencian en el correo de alta en ruta.
6. **Ofertas públicas** (p. 10): si hay que gestionar requisitos formales de
   licitación (plazos, documentación) o solo los datos económicos.
7. **Volúmenes y piloto** (p. 5, 56): nº de máquinas e instalaciones/mes de un
   operador tipo, y si hay un operador real para pilotar la v1.
8. **Plazo y presupuesto objetivo** (p. 58).
