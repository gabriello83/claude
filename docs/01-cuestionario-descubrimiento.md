# Cuestionario de descubrimiento — Plataforma de gestión de instalaciones de Vending

> Documento de análisis previo al diseño funcional. Objetivo: app vendible a operadores
> de vending de tamaño medio y grande, multiidioma (español, inglés, italiano, francés).
>
> Flujo de referencia descrito por el cliente:
> **Comercial** (oferta pública/privada) → **Servicio Técnico** (planograma, preparación
> de máquinas, monederos, cambio) → **Administración** (canon, alta cliente, facturación)
> → **Operaciones** (alta en ruta, reponedor y técnico asignados) → correos de
> coordinación en cada paso, con direcciones configurables.

---

## 1. Producto y modelo de negocio de la app

1. ¿La app se venderá como **SaaS multi-tenant** (cada operador de vending es un tenant),
   como instalación **on-premise** por cliente, o ambas opciones?
2. ¿Modelo de precio previsto: por usuario, por máquina gestionada, por instalación/mes?
   (Condiciona la arquitectura de contadores y licencias.)
3. ¿Mercados objetivo iniciales? (España, Italia, Francia, UK…) — afecta a IVA,
   formatos de moneda, requisitos legales de oferta pública.
4. ¿Existe ya una marca/nombre de producto?
5. ¿Habrá un partner de referencia (un operador real) para pilotar la v1?

## 2. Usuarios y roles

6. Roles identificados: **Comercial, Servicio Técnico, Administración, Jefe de ruta /
   Operaciones, Reponedor, Técnico de campo, Instalador (externo)**. ¿Falta alguno
   (compras, calidad, dirección)?
7. ¿El instalador y los proveedores son siempre externos (solo reciben correos) o
   deben poder entrar en la app (portal externo con acceso limitado)?
8. ¿Un mismo usuario puede tener varios roles (habitual en empresas medianas)?
9. ¿Se necesita flujo de **aprobación** (p. ej. dirección aprueba ofertas por encima
   de X € o con canon superior a Y)?

## 3. Flujo comercial y ofertas

10. Ofertas **públicas** (licitaciones) vs **privadas**: ¿la app debe gestionar los
    requisitos formales de una licitación pública (plazos, documentación, avales) o
    solo capturar los datos económicos?
11. ¿Qué estados debe tener una oferta? Propuesta: *Borrador → Presentada → Ganada /
    Perdida / Desierta*. ¿Se quiere registrar el motivo de pérdida y el competidor?
12. ¿La oferta debe generar un **documento PDF** con plantilla corporativa del operador?
13. ¿Cálculo de rentabilidad en la oferta? (consumo estimado, margen por producto,
    amortización de máquina, coste del canon) — ¿es requisito de v1 o futuro?
14. ¿De dónde salen los clientes potenciales: se cargan a mano, se importan, o hace
    falta un mini-CRM (visitas, seguimiento, recordatorios)?

## 4. Máquinas y catálogo

15. ¿Existe (o hay que crear) un **catálogo de modelos de máquina** con sus
    características: tipo (café vending, café sobremesa, snack, mixta, bebidas frías),
    nº de bandejas, nº de espirales por bandeja, capacidades, selecciones de café?
16. ¿Qué fabricantes hay que soportar de inicio (Necta/Evoca, Azkoyen, Jofemar,
    Bianchi, Rheavendors, Crane…)? ¿Se pueden obtener sus plantillas de bandejas?
17. Para máquinas **usadas/reacondicionadas**: datos mínimos = nº de serie/matrícula,
    nº de monedero. ¿Algo más (año, contador de servicios, estado, ubicación anterior)?
18. Para máquinas **nuevas**: ¿el correo al proveedor debe ser un pedido formal
    (con precio y condiciones) o una solicitud de disponibilidad? ¿Hay que hacer
    seguimiento de la fecha de entrega prevista?
19. Sistemas de pago por máquina: monedero (¿marca/modelo?), lector de tarjeta
    bancaria, tarjeta privada/llave, pago por app. ¿Qué proveedores de pago se usan
    (Nayax, Payter, MDB estándar…)? ¿Basta con registrarlos o hay que integrarse?
20. Telemetría: ¿solo marcar sí/no y proveedor, o se prevé **integración** con
    plataformas de telemetría (Televend, Vendon, Nayax…) para dar de alta la máquina
    automáticamente?

## 5. Planograma

21. ¿El planograma debe ser **visual** (rejilla bandejas × espirales, arrastrar y
    soltar productos) o basta una tabla estructurada exportable/imprimible?
22. ¿Qué datos por posición? Propuesta: bandeja, espiral, producto, capacidad,
    precio, tipo de espiral (simple/doble), y para café: selección, receta, precio.
23. ¿Se quieren **planogramas plantilla** reutilizables por modelo de máquina y tipo
    de cliente (oficina, hospital, fábrica…)?
24. El servicio técnico necesita saber "qué espirales y bandejas preparar":
    ¿la app debe generar una **hoja de preparación de taller** imprimible/PDF por
    máquina? ¿Incluye la lista de espirales a cambiar respecto a la configuración
    de fábrica?
25. ¿El planograma vive solo en la fase de instalación o debe mantenerse como
    "estado actual de la máquina" y versionarse tras cambios posteriores?

## 6. Tarifas, precios y ofertas especiales

26. Import de **Excel de tarifas**: ¿existe un formato ya usado por los operadores
    que haya que respetar, o podemos definir nosotros la plantilla? (Petición:
    poder importar Excel para rellenar tarifas.)
27. Estructura de tarifa detectada — confirmar que cubre todos los casos:
    - Precio por producto (snack/bebida) y por **selección de café**.
    - **Café gratuito para el usuario, facturado al cliente** (¿a qué precio: por
      servicio, por consumo de materia prima, tarifa plana?).
    - **Combos**: combinaciones de productos a precio especial (¿café+snack?
      ¿cómo se detecta el combo en máquina: llave/tarjeta/app?).
    - **Gratuidades**: 1 café / 1 snack / 1 bebida gratis por usuario y día;
      un día de café gratis al año; **lotes de Navidad**. ¿Otras?
28. Las gratuidades por usuario/día requieren identificar al usuario (llave, tarjeta,
    app). ¿La app solo debe **documentar** estas condiciones para configurarlas en la
    máquina/telemetría, o también **liquidarlas/facturarlas**?
29. ¿Tarifas distintas por franja horaria o por colectivo (empleado vs visitante)?
30. ¿Histórico y vigencia de tarifas (fecha inicio/fin, revisiones anuales por IPC)?

## 7. Canon y administración

31. Canon **fijo** (importe/periodicidad) y **variable** (% sobre ventas): ¿también
    mixto (mínimo garantizado + %)? ¿Sobre ventas brutas o netas de IVA?
32. Para el canon variable hacen falta las ventas: ¿entran por telemetría, por
    recaudación manual, o se registran a mano en la app?
33. ¿Qué debe recibir exactamente administración al ganar una oferta? Propuesta:
    ficha de cliente (datos fiscales), condiciones de canon, tarifas, gratuidades a
    facturar, petición de **cambio para monederos** (importe y desglose de monedas).
34. ¿La app debe **facturar** (canon, café facturado al cliente, lotes) o solo
    exportar los datos a un ERP? Si hay ERP: ¿cuáles (SAP, Business Central, A3,
    Sage, software específico de vending)?
35. El alta de cliente: ¿se hace en la app y se sincroniza al ERP, o al revés?

## 8. Correos y comunicaciones

36. Correos identificados: (a) pedido a proveedor de máquinas nuevas, (b) orden al
    instalador, (c) petición de cambio a administración, (d) alta de máquinas en ruta
    con reponedor y técnico asignados. ¿Alguno más (cliente final, telemetría)?
37. Direcciones **configurables**: ¿por empresa, por delegación/zona, por tipo de
    correo? ¿Varios destinatarios y CC?
38. ¿Plantillas de correo editables por el operador (con variables tipo
    {{cliente}}, {{máquina}}, {{fecha}}) y por idioma?
39. ¿Envío por SMTP del operador, Microsoft 365 / Google Workspace? ¿Hace falta
    registrar acuse/respuesta o basta con enviar?
40. ¿Adjuntos: hoja de preparación, planograma PDF, orden de instalación?

## 9. Instalación y operaciones

41. La orden al instalador: ¿incluye fecha/hora planificada, contacto en el cliente,
    requisitos de la ubicación (toma de agua, corriente, ancho de puertas)?
    ¿Se necesita **checklist de instalación** con confirmación (y fotos)?
42. ¿Hay que planificar en **calendario** (vista de instalaciones pendientes por
    semana/instalador)?
43. Alta en ruta: ¿las rutas se gestionan en otra aplicación (¿cuál?) y solo se envía
    el correo, o la app debe mantener el maestro de rutas/reponedores/técnicos?
44. ¿Qué marca el fin del workflow: correo de ruta enviado, confirmación del
    reponedor, primera recaudación?
45. ¿Hay que cubrir también **retiradas** y **sustituciones** de máquinas (fin de
    contrato, avería)? ¿En v1 o después?

## 10. Workflow y trazabilidad

46. ¿El workflow debe ser **configurable por el operador** (añadir/quitar pasos,
    condiciones) o es aceptable un flujo fijo bien diseñado en v1?
    (Recomendación: flujo fijo en v1, motor configurable en v2.)
47. ¿Tareas con responsable, fecha límite y avisos/recordatorios por correo o
    notificación en la app?
48. ¿Panel de control: instalaciones en curso, cuellos de botella, tiempos por fase?
49. ¿Auditoría completa (quién hizo qué y cuándo) — requisito habitual en
    licitaciones públicas?

## 11. Idiomas y localización

50. Idiomas de la **interfaz**: español + inglés, italiano, francés. ¿El español es
    también idioma de producto (se asume que sí)?
51. Los **correos y documentos PDF** ¿en el idioma del destinatario (proveedor
    italiano recibe en italiano) o en el idioma del operador?
52. Monedas: ¿solo EUR o también GBP/CHF? ¿Formatos de fecha/número por región?

## 12. Tecnología, datos y plazos

53. ¿Preferencia tecnológica o libertad total? (Propuesta por defecto: aplicación
    web responsive; los reponedores/técnicos la usan desde el móvil vía navegador
    o PWA. ¿Hace falta app móvil nativa u offline?)
54. ¿Dónde se aloja: nube del proveedor (AWS/Azure/GCP, región UE por RGPD) o
    infraestructura del operador?
55. ¿SSO corporativo (Microsoft Entra/Google) o usuario+contraseña propio?
56. ¿Volumen orientativo por operador: nº máquinas, nº instalaciones/mes, nº
    usuarios? (Dimensiona la solución.)
57. ¿Migración de datos existentes (clientes, máquinas) desde Excel u otro sistema?
58. ¿Plazo objetivo para una v1 y presupuesto orientativo? ¿Se prefiere un MVP
    (workflow + planograma + correos) y crecer por fases?

---

## Alcance de v1 propuesto (a validar)

| Módulo | Contenido | Fase |
|---|---|---|
| Ofertas | Cliente potencial, oferta pública/privada, estados, ganada/perdida | v1 |
| Máquinas | Catálogo de modelos, máquinas nuevas/usadas, nº serie, monedero, pagos, telemetría (sí/no) | v1 |
| Planograma | Editor por bandeja/espiral, plantillas, hoja de preparación de taller | v1 |
| Tarifas | Import Excel, precios por producto/selección, combos, gratuidades, café facturado | v1 |
| Workflow | Flujo fijo Comercial → Técnico → Administración → Ruta, tareas y estados | v1 |
| Correos | Plantillas multiidioma, direcciones configurables, proveedor/instalador/cambio/ruta | v1 |
| Canon | Registro fijo/variable/mixto, traspaso a administración | v1 |
| Facturación | Liquidación de canon variable, facturación de gratuidades | v2 |
| Integraciones | Telemetría, ERP, sistemas de pago | v2 |
| Workflow configurable | Motor de pasos definibles por el operador | v2 |
| Retiradas/sustituciones | Ciclo de vida completo de la máquina | v2 |
