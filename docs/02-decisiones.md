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
| D9 | Fabricantes | Soportar de inicio **Sanden Vendo, Rhea, Bianchi, Evoca/Necta, Azkoyen y Jofemar**. El cliente entregará un **listado de fabricantes y modelos** para cargar como catálogo inicial; el operador podrá añadir modelos propios. |
| D10 | Gratuidades y combos | **Solo documentar en v1**: la app registra las condiciones pactadas (gratuidades por usuario/día, día de café gratis, lotes de Navidad, combos) y las incluye en la hoja de configuración para el técnico. No controla ni liquida consumos. |
| D11 | Canon | La app **no calcula ni liquida el canon**. Solo registra que el cliente tendrá canon (fijo/variable/mixto y sus condiciones) e **informa a administración** dentro del workflow. |
| D12 | Rutas, reponedor y técnico | **Sin maestro de rutas**: la ruta, el reponedor y el técnico asignados se indican como texto en el correo de alta en ruta. |
| D13 | Módulo comercial | **La app no crea ofertas.** El workflow empieza cuando el comercial **registra una oferta ya ganada** (cliente, datos económicos, tarifas, máquinas, canon). No hay CRM, ni estados de oferta, ni aprobaciones, ni generación de PDF de oferta. |
| D14 | Licitaciones | Las ofertas públicas se registran igual que las privadas, **solo con sus datos económicos** (marcando el tipo). La documentación formal de la licitación se gestiona fuera de la app. |
| D15 | Dimensionamiento | Operador **mediano** (500–5.000 máquinas, decenas de instalaciones/mes), **con un operador real pilotando la v1**. |
| D16 | Plazo | **Sin plazo cerrado**: prioridad a la calidad y al alcance completo del MVP. |

## Pendiente de recibir del cliente

- **Listado de fabricantes y modelos** de máquinas (D9) con nº de bandejas,
  espirales por bandeja y selecciones, para cargar el catálogo inicial del
  editor de planogramas.
- Datos del **operador piloto** (D15) cuando esté confirmado.
