# Accesos necesarios a Firebase ("Visita Comercial")

Objetivo: valorar la integración del checklist de instalación con fotos (D24)
y decidir el hosting de DIGIVEND. Con acceso de **solo lectura** es suficiente
para esta fase.

## Qué necesitamos

1. **ID del proyecto Firebase** (o los IDs, si hay proyectos separados de
   desarrollo y producción) y la **región** donde está desplegado
   (importante por RGPD: idealmente `europe-west`).
2. **Invitación a la consola de Firebase** como **Viewer** (rol "Lector") al
   correo que nos indiques del equipo de desarrollo. Desde
   *Configuración del proyecto → Usuarios y permisos → Añadir miembro*.
3. Saber **qué productos de Firebase usa** Visita Comercial:
   - ¿**Cloud Firestore** o **Realtime Database**? (o ambos)
   - ¿**Firebase Storage** para las fotos de las visitas/instalaciones?
   - ¿**Firebase Authentication**? ¿Con qué método (email/contraseña, Google…)?
   - ¿**Cloud Functions** u otros servicios (Hosting, App Check…)?
4. **Estructura de datos**: un export o captura de las colecciones/nodos
   principales (nombres de colecciones, campos de un documento de ejemplo de
   visita/checklist, sin datos personales reales). Si es Firestore, basta
   con capturas de la consola o un pequeño export de documentos de prueba.
5. **Plan de facturación** del proyecto (Spark gratuito o Blaze de pago) —
   condiciona si se pueden usar Cloud Functions para la integración.
6. Si existe, **documentación o contacto del desarrollador** de Visita
   Comercial (para resolver dudas sobre el modelo de datos).

## Qué NO hace falta (todavía)

- Claves de cuentas de servicio ni permisos de escritura: no tocaremos nada
  en esta fase.
- Acceso a datos personales reales de clientes: para el análisis valen
  documentos de ejemplo o anonimizados.

## Para qué se usará

- Confirmar si el **checklist de instalación con fotos** puede alimentarse
  desde Visita Comercial o conviene replicarlo en DIGIVEND.
- Evaluar **Firebase vs AWS** como plataforma de DIGIVEND: si Visita Comercial
  está sana en Firestore + Storage + Auth, integrar ambos en el mismo
  ecosistema reduce coste y fricción.
