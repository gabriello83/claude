// Cloud Functions de DIGIVEND (Fase 3):
//  - onMailCreado: procesa la cola /tenants/{t}/mail y envía por el SMTP del
//    tenant (patrón Trigger Email, pero con un servidor de correo por
//    operador, propuesta técnica §2).
//  - onExpedienteEscrito: vigila el coste acumulado frente a la propuesta de
//    inversión (D25) y encola el aviso a Dirección/Administración una sola vez.

import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { logger } from "firebase-functions";
import nodemailer from "nodemailer";

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: "europe-west1" });

interface SmtpConfig {
  host: string;
  puerto: number;
  seguro?: boolean;
  usuario: string;
  password: string;
  remitente: string;
}

export const onMailCreado = onDocumentCreated(
  "tenants/{tenantId}/mail/{mailId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const correo = snap.data();
    if (correo.estado !== "pendiente") return;

    const { tenantId } = event.params;
    const smtpSnap = await db.doc(`tenants/${tenantId}/secretos/smtp`).get();

    if (!smtpSnap.exists) {
      await snap.ref.update({ estado: "error", error: "SMTP no configurado" });
      logger.warn(`Correo sin enviar: tenant ${tenantId} no tiene SMTP configurado`);
      return;
    }

    const smtp = smtpSnap.data() as SmtpConfig;
    const transporte = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.puerto,
      secure: smtp.seguro ?? smtp.puerto === 465,
      auth: { user: smtp.usuario, pass: smtp.password },
    });

    try {
      await transporte.sendMail({
        from: smtp.remitente,
        to: (correo.para as string[]).join(", "),
        cc: (correo.cc as string[] | undefined)?.join(", ") || undefined,
        subject: correo.asunto as string,
        text: correo.cuerpo as string,
      });
      await snap.ref.update({ estado: "enviado", enviadoEn: FieldValue.serverTimestamp() });
      logger.info(`Correo ${event.params.mailId} (${correo.tipo}) enviado — tenant ${tenantId}`);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e);
      await snap.ref.update({ estado: "error", error: mensaje });
      logger.error(`Error enviando correo ${event.params.mailId}: ${mensaje}`);
    }
  },
);

export const onExpedienteEscrito = onDocumentWritten(
  "tenants/{tenantId}/expedientes/{expedienteId}",
  async (event) => {
    const despues = event.data?.after;
    if (!despues?.exists) return;
    const expediente = despues.data()!;

    const propuesta = expediente.propuestaInversion;
    if (!propuesta?.existe || !propuesta.importe) return;
    if (expediente.avisoExcesoEnviado) return;

    const coste = (expediente.lineasCoste ?? []).reduce(
      (s: number, l: { importe?: number }) => s + (l.importe ?? 0),
      0,
    );
    const exceso = coste - propuesta.importe;
    if (exceso <= 0) return;

    const { tenantId, expedienteId } = event.params;
    const tenantSnap = await db.doc(`tenants/${tenantId}`).get();
    const config = tenantSnap.data() ?? {};

    // Enrutado por delegación con herencia del nivel nacional (D31)
    let destinos = config.correos?.exceso_inversion;
    if (expediente.delegacionId) {
      const delSnap = await db.doc(`tenants/${tenantId}/delegaciones/${expediente.delegacionId}`).get();
      const delDest = delSnap.data()?.correos?.exceso_inversion;
      if (delDest?.para?.length) destinos = delDest;
    }
    if (!destinos?.para?.length) {
      logger.warn(
        `Exceso de inversión en ${expedienteId} pero no hay direcciones para exceso_inversion (tenant ${tenantId})`,
      );
      return;
    }

    const eur = (n: number) =>
      new Intl.NumberFormat(config.idioma === "en" ? "en-GB" : `${config.idioma ?? "es"}-ES`, {
        style: "currency",
        currency: "EUR",
      }).format(n);

    const plantillaSnap = await db
      .doc(`tenants/${tenantId}/plantillasCorreo/exceso_inversion`)
      .get();
    const plantilla = plantillaSnap.exists
      ? (plantillaSnap.data() as { asunto: string; cuerpo: string })
      : {
          asunto: "⚠ Exceso sobre propuesta de inversión — {{cliente}}",
          cuerpo:
            "El coste acumulado de la instalación de {{cliente}} es {{coste}}, y supera la propuesta de inversión ({{inversion}}) en {{exceso}}.\n\nRevisad el expediente.",
        };

    const contexto: Record<string, string> = {
      cliente: expediente.clienteNombre ?? "",
      coste: eur(coste),
      inversion: eur(propuesta.importe),
      exceso: eur(exceso),
    };
    const render = (t: string) =>
      t.replace(/\{\{(\w+)\}\}/g, (_, c: string) => contexto[c] ?? `{{${c}}}`);

    await db.collection(`tenants/${tenantId}/mail`).add({
      tipo: "exceso_inversion",
      para: destinos.para,
      cc: destinos.cc ?? [],
      asunto: render(plantilla.asunto),
      cuerpo: render(plantilla.cuerpo),
      expedienteId,
      estado: "pendiente",
      creadoEn: new Date().toISOString(),
      creadoPor: "sistema",
    });
    await despues.ref.update({ avisoExcesoEnviado: true });
    logger.info(`Aviso de exceso de inversión encolado para ${expedienteId} (tenant ${tenantId})`);
  },
);
