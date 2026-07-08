# Decisiones de producto — v1

Decisiones tomadas con el cliente el 2026-07-07 sobre el cuestionario de
descubrimiento (`01-cuestionario-descubrimiento.md`).

| # | Tema | Decisión |
|---|---|---|
| D1 | Despliegue y modelo de negocio | **SaaS multi-tenant**: una plataforma en la nube, cada operador de vending es un tenant aislado. Precio: **compra única inicial + mantenimiento**. Mercado inicial: **España**; moneda EUR, formatos de fecha/número por región. Marca: **DIGIVEND** (nombre de producto por decidir). |
| D2 | Alcance de la v1 | **MVP del workflow**: ofertas, máquinas, planograma con hoja de taller, import Excel de tarifas, canon, correos configurables y flujo Comercial → Técnico → Administración → Ruta. Facturación e integraciones en v2. |
| D3 | Integraciones en v1 | **Solo correo**: telemetría, monederos y sistemas de pago se registran como datos; toda la coordinación sale por correos con plantillas. Integraciones reales (telemetría, ERP, pagos) en v2. |
| D4 | Plataforma | **Web responsive / PWA**: una sola aplicación web usable en escritorio y móvil, instalable como PWA. Sin app nativa. |
| D5 | Planograma | **Editor visual con rejilla** (bandejas × espirales), asignación de productos con arrastrar y soltar, y hoja de preparación de taller en PDF para el servicio técnico. |
| D6 | Motor de workflow | **Flujo fijo en v1** (Comercial → Técnico → Administración → Ruta) con tareas, responsables y estados. El operador configura direcciones de correo, plantillas y roles; motor configurable en v2. |
| D7 | Idioma de correos y documentos | **Idioma del operador**: todos los correos y PDF salen en el idioma configurado por la empresa de vending (interfaz disponible en ES/EN/IT/FR). |
| D8 | Import de tarifas | **Plantilla Excel propia**, descargable desde la app (productos, selecciones de café, precios, combos, gratuidades), con validación de errores al subirla. |
| D9 | Fabricantes | Soportar de inicio **Sanden Vendo, Rhea, Bianchi, Evoca/Necta, Azkoyen y Jofemar**. El cliente **ya dispone del catálogo** de fabricantes y modelos (bandejas, espirales, selecciones) y lo entregará para cargarlo como catálogo inicial; el operador podrá añadir modelos propios. |
| D10 | Gratuidades y combos | **Solo documentar en v1**: la app registra las condiciones pactadas (gratuidades por usuario/día, día de café gratis, lotes de Navidad, combos) y las incluye en la hoja de configuración para el técnico. No controla ni liquida consumos. |
| D11 | Canon | La app **no calcula ni liquida el canon**. Solo registra que el cliente tendrá canon (fijo/variable/mixto y sus condiciones) e **informa a administración** dentro del workflow. |
| D12 | Rutas, reponedor y técnico | **Sin maestro de rutas**: la ruta, el reponedor y el técnico asignados se indican como texto en el correo de alta en ruta. |
| D13 | Módulo comercial | **La app no crea ofertas.** El workflow empieza cuando el comercial **registra una oferta ya ganada** (cliente, datos económicos, tarifas, máquinas, canon). No hay CRM, ni estados de oferta, ni aprobaciones, ni generación de PDF de oferta. |
| D14 | Licitaciones | Las ofertas públicas se registran igual que las privadas, **solo con sus datos económicos** (marcando el tipo). La documentación formal de la licitación se gestiona fuera de la app. |
| D15 | Dimensionamiento | Operador piloto real confirmado: **~4.000 máquinas, ~5 instalaciones/mes, ~120 usuarios**. |
| D16 | Plazo | **Sin plazo cerrado**: prioridad a la calidad y al alcance completo del MVP. |
| D17 | Roles ampliados | Añadir **Dirección** como rol: **puede revisar todos los pasos** de cualquier expediente (visibilidad y aprobación transversal). El instalador puede ser **interno o externo**. Los **reponedores y técnicos de campo no usan la app** ni reciben información directa: solo se les referencia en el correo de alta en ruta. |
| D18 | Pedido a proveedores | El correo de máquinas nuevas es una **solicitud de disponibilidad** (no pedido formal) **con seguimiento de la fecha de entrega**. Si se opta por máquinas usadas, se genera una **petición al servicio técnico**, que puede **proponer un modelo alternativo**. Los periféricos nuevos (monederos, lectores de pago, billeteros, telemetría) también se solicitan a proveedores. |
| D19 | Planograma como módulo | El editor visual de planogramas es un **módulo licenciable por separado**. Espirales **simple, doble y triple**. Para máquinas nuevas se **envía el planograma al fabricante** (solo tipos de espirales y huecos). Las **reglas de creación de planogramas** se definirán con el cliente. Optimización del planograma según ventas/reposiciones: **v2**. |
| D20 | Tarifas avanzadas | Además del import Excel: posibilidad de tarifas por **franja horaria y por colectivo** (empleado/visitante), **vigencias con histórico** y **revisión por IPC** (subida por importe fijo o porcentaje, con **redondeo a 0,05 €** para el pago en efectivo). |
| D21 | Máquinas usadas | Datos mínimos: nº de serie/matrícula, nº de monedero y **contador de servicios**. |
| D22 | Alcance v1 ampliado | Además de la instalación, la v1 cubre los workflows de **retirada de máquinas, sustitución, cambio de planograma y subida de precios**. |
| D23 | Operaciones | Las rutas se gestionan en **VendCloud**: la app solo envía el correo de alta en ruta, y ese envío **cierra el workflow**. El supervisor recibe el aviso para **rellenar el ERP**, con una tarea de verificación en la app. Sin vista de calendario en v1. Los recordatorios de tareas llegan **por correo**. Panel de control de instalaciones en curso y auditoría completa: **sí**. |
| D24 | Tecnología | Autenticación con **usuario/contraseña propia** (sin SSO). **Migración inicial desde Excel**. El cliente ya tiene la app **"Visita Comercial"** con datos en **Firebase** (checklist de instalación con fotos podría venir de ahí) y cuenta también con usuario de AWS; la recomendación de plataforma de hosting queda pendiente de la propuesta técnica. |
| D25 | Propuesta de inversión | Al **crear un cliente nuevo** se informa a administración y se le **pregunta si existe una propuesta de inversión**; en caso afirmativo se registran sus detalles (importe y partidas). El expediente acumula los **costes reales** (máquinas, periféricos, equipamiento, instalación) y **controla que el coste total no supere la propuesta de inversión**, avisando si se excede. |
| D26 | Equipamiento adicional | Además de máquinas, el cliente puede pedir **muebles, panelados, microondas, fuentes de agua…** Cada elemento tiene **proveedor y coste**, se solicita por correo como las máquinas (D18) y computa en el control de inversión (D25). Sin planograma. |
| D27 | Catálogo recibido | El cliente ha entregado el **listado de tipos de máquina** (202 tipos, 10 clases, 20 marcas): `data/Listado_de_Tipos_de_maquina.xlsx`. Análisis en `04-catalogo-tipos-maquina.md`. Cierra el pendiente de D9. |
| D28 | Plataforma: Firebase | Recibida la información del proyecto Firebase existente ("Serunion Vending APP", `vending-care-tracker`): plan **Blaze**, con **Firestore, Hosting, Authentication y App Check** en uso y dos apps web ("Atención al cliente" y "Visitas comerciales"). **Se recomienda Firebase como plataforma de DIGIVEND** (mismo ecosistema, integración directa con Visitas Comerciales). Región `europe-west1` confirmada (RGPD ✔). Detalle en `05-accesos-firebase.md`. |
| D29 | Catálogo de artículos recibido | El cliente ha entregado el **listado de artículos para planogramas** (858 artículos, 7 categorías, 56 subcategorías, 90 fabricantes): `data/Listado_de_Articulos.xlsx`. Los códigos coinciden con VendCloud. Las **imágenes de producto** existen en una carpeta local del cliente y se cargarán a Firebase Storage con la convención `tenants/{tenantId}/productos/{codigo}`. Análisis en `07-catalogo-articulos.md`. |

## Pendiente de recibir del cliente / por concretar

- **ZIP con las imágenes de producto** (D29): comprimir la carpeta local
  (`…\Vencloud\Imagenes\Productos`) y entregarla; idealmente cada fichero
  nombrado con el código de artículo para el emparejamiento automático.
- **Reglas de creación de planogramas** (D19): se definirán más adelante,
  acordado con el cliente.
- **Umbrales de aprobación de Dirección** (D17): Dirección revisa todos los
  pasos; queda por concretar si algún paso requiere su aprobación bloqueante
  (p. ej. superar la propuesta de inversión, D25).
- **Firebase** (D28): región del proyecto (RGPD), estructura de colecciones de
  Firestore con un documento de ejemplo anonimizado, método de Authentication,
  si hay Cloud Functions desplegadas, e invitación como Viewer cuando arranque
  el desarrollo. Detalle en `05-accesos-firebase.md`.
