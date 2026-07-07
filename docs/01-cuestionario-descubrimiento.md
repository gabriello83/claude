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

   Solo Saas Multi-tenant
   
2. ¿Modelo de precio previsto: por usuario, por máquina gestionada, por instalación/mes?
   (Condiciona la arquitectura de contadores y licencias.) compra unica inicial + mantenimiennto
   
3. ¿Mercados objetivo iniciales? (España, Italia, Francia, UK…) — afecta a IVA,
   formatos de moneda, requisitos legales de oferta pública. España primero
   
4. ¿Existe ya una marca/nombre de producto?   Marca DIGIVEND Nombre no existe

5. ¿Habrá un partner de referencia (un operador real) para pilotar la v1? Si 

## 2. Usuarios y roles

6. Roles identificados: **Comercial, Servicio Técnico, Administración, Jefe de ruta /
   Operaciones, Reponedor, Técnico de campo, Instalador (externo)**. ¿Falta alguno
   (compras, calidad, dirección)? Direccion
7. ¿El instalador y los proveedores son siempre externos (solo reciben correos) o
   deben poder entrar en la app (portal externo con acceso limitado)?
   A veces puede ser interno
8. ¿Un mismo usuario puede tener varios roles (habitual en empresas medianas)? SI
9. ¿Se necesita flujo de **aprobación** (p. ej. dirección aprueba ofertas por encima
   de X € o con canon superior a Y)? SI

## 3. Flujo comercial y ofertas

10. Ofertas **públicas** (licitaciones) vs **privadas**: ¿la app debe gestionar los
    requisitos formales de una licitación pública (plazos, documentación, avales) o
    solo capturar los datos económicos? Capturar los datos economicos
    
11. ¿Qué estados debe tener una oferta? Propuesta: *Borrador → Presentada → Ganada /
    Perdida / Desierta*. ¿Se quiere registrar el motivo de pérdida y el competidor? NO este software se utiliza solo cuando se gana
    
12. ¿La oferta debe generar un **documento PDF** con plantilla corporativa del operador? No

13. ¿Cálculo de rentabilidad en la oferta? (consumo estimado, margen por producto,
    amortización de máquina, coste del canon) — ¿es requisito de v1 o futuro? Esto lo hará otra app.
14. ¿De dónde salen los clientes potenciales: se cargan a mano, se importan, o hace
    falta un mini-CRM (visitas, seguimiento, recordatorios)? Se cargan solo los clientes que se han ganado, Este software no es para analizar, crear oferta comerciales

## 4. Máquinas y catálogo

15. ¿Existe (o hay que crear) un **catálogo de modelos de máquina** con sus
    características: tipo (café vending, café sobremesa, snack, mixta, bebidas frías),
    nº de bandejas, nº de espirales por bandeja, capacidades, selecciones de café? Si lo tengo
16. ¿Qué fabricantes hay que soportar de inicio (Necta/Evoca, Azkoyen, Jofemar,
    Bianchi, Rheavendors, Crane…)? ¿Se pueden obtener sus plantillas de bandejas? Hay que añadir Sanden Vendo y
17. Para máquinas **usadas/reacondicionadas**: datos mínimos = nº de serie/matrícula,
    nº de monedero. ¿Algo más (año, contador de servicios, estado, ubicación anterior)? contador de servicio
18. Para máquinas **nuevas**: ¿el correo al proveedor debe ser un pedido formal
    (con precio y condiciones) o una solicitud de disponibilidad? ¿Hay que hacer
    seguimiento de la fecha de entrega prevista? Es una solicitud de disponibilidad hay que hacer seguimineto y si las maquinas estan usada hacer la peticion al servicio tecnico, el servicio tecnico puede proponer otro tipo de modelo. 
19. Sistemas de pago por máquina: monedero (¿marca/modelo?), lector de tarjeta
    bancaria, tarjeta privada/llave, pago por app. ¿Qué proveedores de pago se usan
    (Nayax, Payter, MDB estándar…)? ¿Basta con registrarlos o hay que integrarse?
20. Telemetría: ¿solo marcar sí/no y proveedor, o se prevé **integración** con
    plataformas de telemetría (Televend, Vendon, Nayax…) para dar de alta la máquina
    automáticamente? en futuro si integracion con televend, Cas Lab, Frekuent

## 5. Planograma

21. ¿El planograma debe ser **visual** (rejilla bandejas × espirales, arrastrar y
    soltar productos) o basta una tabla estructurada exportable/imprimible? visual tiene que ser un modulo a parte que puede ser vendido separatamente.
22. ¿Qué datos por posición? Propuesta: bandeja, espiral, producto, capacidad,
    precio, tipo de espiral (simple/doble), y para café: selección, receta, precio. Si correccto. Tambien possiblidad de espiral triple es raro. Hay que decidir las reglas para crear un planograma nuevo . Este programa podrá  tambien dado un planograma con una plantilla y segun las ventas o reposiciones modificar el planograma mas rentable.
23. ¿Se quieren **planogramas plantilla** reutilizables por modelo de máquina y tipo
    de cliente (oficina, hospital, fábrica…)? Si
24. El servicio técnico necesita saber "qué espirales y bandejas preparar":
    ¿la app debe generar una **hoja de preparación de taller** imprimible/PDF por
    máquina? ¿Incluye la lista de espirales a cambiar respecto a la configuración
    de fábrica? Correcto
25. ¿El planograma vive solo en la fase de instalación o debe mantenerse como
    "estado actual de la máquina" y versionarse tras cambios posteriores? el planograma vive solo en instalacion  y si las maquina es nueva enviar planograma al fabricante solo con tipo de espirales y huecos para espirales.

## 6. Tarifas, precios y ofertas especiales

26. Import de **Excel de tarifas**: ¿existe un formato ya usado por los operadores 
    que haya que respetar, o podemos definir nosotros la plantilla? (Petición:
    poder importar Excel para rellenar tarifas.) Si
27. Estructura de tarifa detectada — confirmar que cubre todos los casos:
    - Precio por producto (snack/bebida) y por **selección de café**.
    - **Café gratuito para el usuario, facturado al cliente** (¿a qué precio: por
      servicio, por consumo de materia prima, tarifa plana?).
    - **Combos**: combinaciones de productos a precio especial (¿café+snack?
      ¿cómo se detecta el combo en máquina: llave/tarjeta/app?).
    - **Gratuidades**: 1 café / 1 snack / 1 bebida gratis por usuario y día;
      un día de café gratis al año; **lotes de Navidad**. ¿Otras? añadir un campo otro 
28. Las gratuidades por usuario/día requieren identificar al usuario (llave, tarjeta,
    app). ¿La app solo debe **documentar** estas condiciones para configurarlas en la
    máquina/telemetría, o también **liquidarlas/facturarlas**? solo documentar para que el servicio tecnico pueda hacer la prueba y administracion configure la facturacion.
29. ¿Tarifas distintas por franja horaria o por colectivo (empleado vs visitante)? SI es una posibilidad
30. ¿Histórico y vigencia de tarifas (fecha inicio/fin, revisiones anuales por IPC)? si en el modilo tarifa puedes añadir esta potencialidad que te pide la subida por fijo o percentaje por IPC redondeando a 0.05e por el efectivo.

## 7. Canon y administración

31. Canon **fijo** (importe/periodicidad) y **variable** (% sobre ventas): ¿también
    mixto (mínimo garantizado + %)? Solo dato informativo para administracion
32. Para el canon variable hacen falta las ventas: ¿entran por telemetría, por
    recaudación manual, o se registran a mano en la app? Solo dato informativo para administracion
33. ¿Qué debe recibir exactamente administración al ganar una oferta? Propuesta:
    ficha de cliente (datos fiscales), condiciones de canon, tarifas, gratuidades a
    facturar, petición de **cambio para monederos** (importe y desglose de monedas).
34. ¿La app debe **facturar** (canon, café facturado al cliente, lotes) o solo
    exportar los datos a un ERP? Si hay ERP: ¿cuáles (SAP, Business Central, A3,
    Sage, software específico de vending)? De momento solo informar administracion
35. El alta de cliente: ¿se hace en la app y se sincroniza al ERP, o al revés? solo se informa administracion para qlo de de alta.

## 8. Correos y comunicaciones

36. Correos identificados: (a) pedido a proveedor de máquinas nuevas, (b) orden al
    instalador, (c) petición de cambio a administración, (d) alta de máquinas en ruta
    con reponedor y técnico asignados. ¿Alguno más (cliente final, telemetría)? Informar a servicio tecnico de que maquina tiene que preparar, con tipo de monederos, con tipo de lector de pago, con telemetria. con billetera, Tambien si hay que comptrarlos nuevos hay que pedirlo a los proveedores.
37. Direcciones **configurables**: ¿por empresa, por delegación/zona, por tipo de
    correo? ¿Varios destinatarios y CC? SI
38. ¿Plantillas de correo editables por el operador (con variables tipo
    {{cliente}}, {{máquina}}, {{fecha}}) y por idioma? SI
39. ¿Envío por SMTP del operador, Microsoft 365 / Google Workspace? ¿Hace falta
    registrar acuse/respuesta o basta con enviar? Basta con enviar
40. ¿Adjuntos: hoja de preparación, planograma PDF, orden de instalación?

## 9. Instalación y operaciones

41. La orden al instalador: ¿incluye fecha/hora planificada, contacto en el cliente,
    requisitos de la ubicación (toma de agua, corriente, ancho de puertas)? SI rellena el comercial
    ¿Se necesita **checklist de instalación** con confirmación (y fotos)? Si tengo otra applicacion que se llama Visita comerciale que podria pasar esta informaciones los datos son en Firebase.
42. ¿Hay que planificar en **calendario** (vista de instalaciones pendientes por
    semana/instalador)? solo informar al supervisor que tiene que rellenar el ERP con las iformaciones y luego chequearlo de alguna manera
43. Alta en ruta: ¿las rutas se gestionan en otra aplicación (¿cuál?) y solo se envía se Gestionan con Vencloud
    el correo, o la app debe mantener el maestro de rutas/reponedores/técnicos?
44. ¿Qué marca el fin del workflow: correo de ruta enviado, confirmación del
    reponedor, primera recaudación? correo de ruta enviado
45. ¿Hay que cubrir también **retiradas** y **sustituciones** de máquinas (fin de
    contrato, avería)? ¿En v1 o después? Si con v1 y tambien cambios de planogramas o subida de precios

## 10. Workflow y trazabilidad

46. ¿El workflow debe ser **configurable por el operador** (añadir/quitar pasos,
    condiciones) o es aceptable un flujo fijo bien diseñado en v1?
    (Recomendación: flujo fijo en v1, motor configurable en v2.) OK
47. ¿Tareas con responsable, fecha límite y avisos/recordatorios por correo o
    notificación en la app?por correo
48. ¿Panel de control: instalaciones en curso, cuellos de botella, tiempos por fase? ok
49. ¿Auditoría completa (quién hizo qué y cuándo) — requisito habitual en
    licitaciones públicas? Si

## 11. Idiomas y localización

50. Idiomas de la **interfaz**: español + inglés, italiano, francés. ¿El español es
    también idioma de producto (se asume que sí)?Si
51. Los **correos y documentos PDF** ¿en el idioma del destinatario (proveedor
    italiano recibe en italiano) o en el idioma del operador? en el idioma del operador
52. Monedas: ¿solo EUR o también GBP/CHF? ¿Formatos de fecha/número por región? Euro y fecha numero por region

## 12. Tecnología, datos y plazos

53. ¿Preferencia tecnológica o libertad total? (Propuesta por defecto: aplicación
    web responsive; los reponedores/técnicos la usan desde el móvil vía navegador
    o PWA. ¿Hace falta app móvil nativa u offline?)   los reponedores y tecnico no tienen que recibir esta informacion
54. ¿Dónde se aloja: nube del proveedor (AWS/Azure/GCP, región UE por RGPD) o
    infraestructura del operador? firebase Hosting o aconseja algo. tengo tambien usuario en AWS
55. ¿SSO corporativo (Microsoft Entra/Google) o usuario+contraseña propio? usuario contraseña proprio
56. ¿Volumen orientativo por operador: nº máquinas, nº instalaciones/mes, nº
    usuarios? (Dimensiona la solución.) 4000 maquinas 5 instralaciones mes, usuarios 120
57. ¿Migración de datos existentes (clientes, máquinas) desde Excel u otro sistema? Excel
58. ¿Plazo objetivo para una v1 y presupuesto orientativo? ¿Se prefiere un MVP
    (App visita comerciale (ya existe) + workflow + planograma + correos) y crecer por fases? MVP

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

