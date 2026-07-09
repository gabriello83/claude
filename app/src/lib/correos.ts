// Correos de coordinación (diseño funcional §6). El cliente compone el correo
// a partir de la plantilla del tenant (o la de por defecto en su idioma) y lo
// encola en /tenants/{t}/mail; la Cloud Function onMailCreado lo envía por el
// SMTP del tenant y actualiza su estado.

import {
  addDoc,
  collection,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Idioma, TenantConfig, TipoCorreo } from "@/types/domain";

export interface CorreoEncolado {
  tipo: TipoCorreo;
  para: string[];
  cc: string[];
  asunto: string;
  cuerpo: string;
  expedienteId?: string;
  estado: "pendiente" | "enviado" | "error";
  error?: string;
  creadoEn: string;
  creadoPor: string;
}

interface Plantilla {
  asunto: string;
  cuerpo: string;
}

/** Variables por tipo, para mostrarlas en la pantalla de configuración */
export const VARIABLES_CORREO: Record<TipoCorreo, string[]> = {
  preparacion_tecnica: ["cliente", "direccion", "fecha", "maquinas"],
  solicitud_proveedor: ["cliente", "maquinas", "fecha"],
  aviso_cliente_nuevo: ["cliente", "direccion", "canon"],
  planograma_fabricante: ["cliente", "maquinas"],
  peticion_cambio: ["cliente", "maquinas", "importe"],
  orden_instalacion: ["cliente", "direccion", "contacto", "fecha", "requisitos", "maquinas"],
  alta_ruta: ["cliente", "direccion", "ruta", "reponedor", "tecnico", "maquinas"],
  exceso_inversion: ["cliente", "coste", "inversion", "exceso"],
};

const PLANTILLAS_DEFECTO: Record<Idioma, Record<TipoCorreo, Plantilla>> = {
  es: {
    preparacion_tecnica: {
      asunto: "Preparación de máquinas — {{cliente}}",
      cuerpo:
        "Nueva instalación para {{cliente}} en {{direccion}} (fecha prevista: {{fecha}}).\n\nMáquinas y periféricos a preparar:\n{{maquinas}}\n\nGracias.",
    },
    solicitud_proveedor: {
      asunto: "Solicitud de disponibilidad — {{cliente}}",
      cuerpo:
        "Buenos días,\n\nNecesitamos disponibilidad y plazo de entrega para el siguiente material, destinado a la instalación de {{cliente}}:\n{{maquinas}}\n\nFecha objetivo: {{fecha}}.\n\nQuedamos a la espera de confirmación.",
    },
    aviso_cliente_nuevo: {
      asunto: "Cliente nuevo — {{cliente}}",
      cuerpo:
        "Se ha registrado la oferta ganada de {{cliente}} ({{direccion}}).\nCanon: {{canon}}.\n\n¿Existe propuesta de inversión para este cliente? Por favor, responded en el expediente e indicad importe y partidas.",
    },
    planograma_fabricante: {
      asunto: "Planograma de fábrica — {{cliente}}",
      cuerpo:
        "Adjuntamos la configuración de espirales y huecos para las máquinas del cliente {{cliente}}:\n{{maquinas}}\n\nRogamos confirmación.",
    },
    peticion_cambio: {
      asunto: "Petición de cambio para monederos — {{cliente}}",
      cuerpo:
        "Para la instalación de {{cliente}} necesitamos preparar el cambio de los monederos:\n{{maquinas}}\n\nImporte solicitado: {{importe}}.",
    },
    orden_instalacion: {
      asunto: "Orden de instalación — {{cliente}}",
      cuerpo:
        "Instalación en {{cliente}}, {{direccion}}.\nFecha: {{fecha}}. Contacto: {{contacto}}.\nRequisitos de la ubicación: {{requisitos}}.\n\nMáquinas:\n{{maquinas}}",
    },
    alta_ruta: {
      asunto: "Alta en ruta — {{cliente}}",
      cuerpo:
        "Cliente {{cliente}} ({{direccion}}) instalado y listo para ruta.\n\nRuta: {{ruta}}\nReponedor: {{reponedor}}\nTécnico: {{tecnico}}\n\nMáquinas:\n{{maquinas}}\n\nPor favor, dad de alta en el ERP y confirmad.",
    },
    exceso_inversion: {
      asunto: "⚠ Exceso sobre propuesta de inversión — {{cliente}}",
      cuerpo:
        "El coste acumulado de la instalación de {{cliente}} es {{coste}}, y supera la propuesta de inversión ({{inversion}}) en {{exceso}}.\n\nRevisad el expediente.",
    },
  },
  en: {
    preparacion_tecnica: {
      asunto: "Machine preparation — {{cliente}}",
      cuerpo:
        "New installation for {{cliente}} at {{direccion}} (planned date: {{fecha}}).\n\nMachines and peripherals to prepare:\n{{maquinas}}\n\nThank you.",
    },
    solicitud_proveedor: {
      asunto: "Availability request — {{cliente}}",
      cuerpo:
        "Hello,\n\nWe need availability and delivery time for the following items, for the installation at {{cliente}}:\n{{maquinas}}\n\nTarget date: {{fecha}}.\n\nAwaiting your confirmation.",
    },
    aviso_cliente_nuevo: {
      asunto: "New customer — {{cliente}}",
      cuerpo:
        "The won offer for {{cliente}} ({{direccion}}) has been registered.\nFee: {{canon}}.\n\nIs there an investment proposal for this customer? Please reply in the work order with amount and items.",
    },
    planograma_fabricante: {
      asunto: "Factory planogram — {{cliente}}",
      cuerpo:
        "Please find the spiral and slot configuration for the machines of {{cliente}}:\n{{maquinas}}\n\nPlease confirm.",
    },
    peticion_cambio: {
      asunto: "Coin change request — {{cliente}}",
      cuerpo:
        "For the installation at {{cliente}} we need change prepared for the coin changers:\n{{maquinas}}\n\nRequested amount: {{importe}}.",
    },
    orden_instalacion: {
      asunto: "Installation order — {{cliente}}",
      cuerpo:
        "Installation at {{cliente}}, {{direccion}}.\nDate: {{fecha}}. Contact: {{contacto}}.\nSite requirements: {{requisitos}}.\n\nMachines:\n{{maquinas}}",
    },
    alta_ruta: {
      asunto: "Route assignment — {{cliente}}",
      cuerpo:
        "Customer {{cliente}} ({{direccion}}) installed and ready for route.\n\nRoute: {{ruta}}\nReplenisher: {{reponedor}}\nTechnician: {{tecnico}}\n\nMachines:\n{{maquinas}}\n\nPlease register in the ERP and confirm.",
    },
    exceso_inversion: {
      asunto: "⚠ Investment proposal exceeded — {{cliente}}",
      cuerpo:
        "The accumulated cost of the installation at {{cliente}} is {{coste}}, exceeding the investment proposal ({{inversion}}) by {{exceso}}.\n\nPlease review the work order.",
    },
  },
  it: {
    preparacion_tecnica: {
      asunto: "Preparazione macchine — {{cliente}}",
      cuerpo:
        "Nuova installazione per {{cliente}} in {{direccion}} (data prevista: {{fecha}}).\n\nMacchine e periferiche da preparare:\n{{maquinas}}\n\nGrazie.",
    },
    solicitud_proveedor: {
      asunto: "Richiesta di disponibilità — {{cliente}}",
      cuerpo:
        "Buongiorno,\n\nabbiamo bisogno di disponibilità e tempi di consegna per il seguente materiale, destinato all'installazione presso {{cliente}}:\n{{maquinas}}\n\nData obiettivo: {{fecha}}.\n\nIn attesa di conferma.",
    },
    aviso_cliente_nuevo: {
      asunto: "Nuovo cliente — {{cliente}}",
      cuerpo:
        "È stata registrata l'offerta vinta di {{cliente}} ({{direccion}}).\nCanone: {{canon}}.\n\nEsiste una proposta di investimento per questo cliente? Rispondete nella pratica indicando importo e voci.",
    },
    planograma_fabricante: {
      asunto: "Planogramma di fabbrica — {{cliente}}",
      cuerpo:
        "Alleghiamo la configurazione di spirali e vani per le macchine del cliente {{cliente}}:\n{{maquinas}}\n\nSi prega di confermare.",
    },
    peticion_cambio: {
      asunto: "Richiesta fondo cassa — {{cliente}}",
      cuerpo:
        "Per l'installazione presso {{cliente}} è necessario preparare il fondo cassa delle gettoniere:\n{{maquinas}}\n\nImporto richiesto: {{importe}}.",
    },
    orden_instalacion: {
      asunto: "Ordine di installazione — {{cliente}}",
      cuerpo:
        "Installazione presso {{cliente}}, {{direccion}}.\nData: {{fecha}}. Contatto: {{contacto}}.\nRequisiti del sito: {{requisitos}}.\n\nMacchine:\n{{maquinas}}",
    },
    alta_ruta: {
      asunto: "Assegnazione al giro — {{cliente}}",
      cuerpo:
        "Cliente {{cliente}} ({{direccion}}) installato e pronto per il giro.\n\nGiro: {{ruta}}\nRifornitore: {{reponedor}}\nTecnico: {{tecnico}}\n\nMacchine:\n{{maquinas}}\n\nRegistrate nell'ERP e confermate.",
    },
    exceso_inversion: {
      asunto: "⚠ Superata la proposta di investimento — {{cliente}}",
      cuerpo:
        "Il costo accumulato dell'installazione presso {{cliente}} è {{coste}}, e supera la proposta di investimento ({{inversion}}) di {{exceso}}.\n\nControllate la pratica.",
    },
  },
  fr: {
    preparacion_tecnica: {
      asunto: "Préparation des machines — {{cliente}}",
      cuerpo:
        "Nouvelle installation pour {{cliente}} à {{direccion}} (date prévue : {{fecha}}).\n\nMachines et périphériques à préparer :\n{{maquinas}}\n\nMerci.",
    },
    solicitud_proveedor: {
      asunto: "Demande de disponibilité — {{cliente}}",
      cuerpo:
        "Bonjour,\n\nNous avons besoin de la disponibilité et du délai de livraison pour le matériel suivant, destiné à l'installation chez {{cliente}} :\n{{maquinas}}\n\nDate cible : {{fecha}}.\n\nDans l'attente de votre confirmation.",
    },
    aviso_cliente_nuevo: {
      asunto: "Nouveau client — {{cliente}}",
      cuerpo:
        "L'offre gagnée de {{cliente}} ({{direccion}}) a été enregistrée.\nRedevance : {{canon}}.\n\nExiste-t-il une proposition d'investissement pour ce client ? Merci de répondre dans le dossier avec le montant et les postes.",
    },
    planograma_fabricante: {
      asunto: "Planogramme d'usine — {{cliente}}",
      cuerpo:
        "Veuillez trouver la configuration des spirales et emplacements pour les machines du client {{cliente}} :\n{{maquinas}}\n\nMerci de confirmer.",
    },
    peticion_cambio: {
      asunto: "Demande de fonds de caisse — {{cliente}}",
      cuerpo:
        "Pour l'installation chez {{cliente}}, nous devons préparer le fonds de caisse des monnayeurs :\n{{maquinas}}\n\nMontant demandé : {{importe}}.",
    },
    orden_instalacion: {
      asunto: "Ordre d'installation — {{cliente}}",
      cuerpo:
        "Installation chez {{cliente}}, {{direccion}}.\nDate : {{fecha}}. Contact : {{contacto}}.\nExigences du site : {{requisitos}}.\n\nMachines :\n{{maquinas}}",
    },
    alta_ruta: {
      asunto: "Affectation à la tournée — {{cliente}}",
      cuerpo:
        "Client {{cliente}} ({{direccion}}) installé et prêt pour la tournée.\n\nTournée : {{ruta}}\nApprovisionneur : {{reponedor}}\nTechnicien : {{tecnico}}\n\nMachines :\n{{maquinas}}\n\nMerci de créer dans l'ERP et de confirmer.",
    },
    exceso_inversion: {
      asunto: "⚠ Proposition d'investissement dépassée — {{cliente}}",
      cuerpo:
        "Le coût cumulé de l'installation chez {{cliente}} est de {{coste}}, dépassant la proposition d'investissement ({{inversion}}) de {{exceso}}.\n\nMerci de vérifier le dossier.",
    },
  },
};

export function renderPlantilla(texto: string, contexto: Record<string, string>): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, clave: string) => contexto[clave] ?? `{{${clave}}}`);
}

export function plantillaDefecto(idioma: Idioma, tipo: TipoCorreo): Plantilla {
  return PLANTILLAS_DEFECTO[idioma]?.[tipo] ?? PLANTILLAS_DEFECTO.es[tipo];
}

/**
 * Compone el correo con la plantilla del tenant (o la de por defecto en el
 * idioma del operador, D7) y lo encola. Devuelve error si el tipo no tiene
 * direcciones configuradas.
 */
export async function encolarCorreo(opts: {
  tenantId: string;
  tipo: TipoCorreo;
  contexto: Record<string, string>;
  expedienteId?: string;
  creadoPor: string;
}): Promise<{ ok: true } | { ok: false; motivo: "sin_direcciones" }> {
  const { tenantId, tipo, contexto, expedienteId, creadoPor } = opts;

  const tenantSnap = await getDoc(doc(db, "tenants", tenantId));
  const config = (tenantSnap.data() ?? {}) as Partial<TenantConfig>;
  const destinos = config.correos?.[tipo];
  if (!destinos?.para?.length) return { ok: false, motivo: "sin_direcciones" };

  const plantillaSnap = await getDoc(doc(db, "tenants", tenantId, "plantillasCorreo", tipo));
  const plantilla = plantillaSnap.exists()
    ? (plantillaSnap.data() as Plantilla)
    : plantillaDefecto(config.idioma ?? "es", tipo);

  const correo: CorreoEncolado = {
    tipo,
    para: destinos.para,
    cc: destinos.cc ?? [],
    asunto: renderPlantilla(plantilla.asunto, contexto),
    cuerpo: renderPlantilla(plantilla.cuerpo, contexto),
    ...(expedienteId ? { expedienteId } : {}),
    estado: "pendiente",
    creadoEn: new Date().toISOString(),
    creadoPor,
  };
  await addDoc(collection(db, "tenants", tenantId, "mail"), correo);
  return { ok: true };
}
