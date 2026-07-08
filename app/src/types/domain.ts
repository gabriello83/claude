// Modelo de dominio DIGIVEND v1 — ver docs/03-diseno-funcional.md §5
// Todos los documentos de negocio viven bajo /tenants/{tenantId}/...

export type Rol =
  | "admin"
  | "direccion"
  | "comercial"
  | "tecnico"
  | "administracion"
  | "operaciones";

export type Idioma = "es" | "en" | "it" | "fr";

export type TipoCorreo =
  | "preparacion_tecnica"
  | "solicitud_proveedor"
  | "aviso_cliente_nuevo"
  | "planograma_fabricante"
  | "peticion_cambio"
  | "orden_instalacion"
  | "alta_ruta"
  | "exceso_inversion";

export interface TenantConfig {
  nombre: string;
  idioma: Idioma;
  /** Direcciones por tipo de correo: para y CC configurables (D23, q37) */
  correos: Partial<Record<TipoCorreo, { para: string[]; cc: string[] }>>;
  /** Módulos licenciables activos (D19) */
  modulos: { planograma: boolean };
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  roles: Rol[]; // multi-rol (D17)
  activo: boolean;
}

// ---- Catálogo (D9, D27) ----

export type ClaseMaquina =
  | "Bebidas Calientes/Preparadas"
  | "Bebidas Frías/Envasadas"
  | "Snack/Multiproducto"
  | "OCS/Café Capsula-Grano"
  | "Combi - Mixtas (Caliente - Frío)"
  | "Fuente de Agua"
  | "Compactadoras"
  | "Máquinas de cambio"
  | "Zumos"
  | "Genérica/Otros";

export interface ModeloMaquina {
  id: string;
  codigo: string; // C0001, F0001...
  clase: ClaseMaquina | string;
  marca: string;
  modelo: string;
  formato: number | null;
  /** Nº total de selecciones/canales */
  canales: number;
  /** Rejilla del planograma: filas = bandejas, columnas = espirales por bandeja */
  filas: number;
  columnas: number;
  canalesExtra: number;
  /** Contenedores (máquinas de café) */
  contenedores: number;
}

// ---- Artículos (catálogo para planogramas, docs/07-catalogo-articulos.md) ----

export interface Producto {
  id: string;
  /** Código de artículo (coincide con VendCloud); también es el ID del documento */
  codigo: string;
  nombre: string;
  obsoleto: boolean;
  fabricante: string;
  categoria: string; // p. ej. "SNACK", "BEBIDA FRIA"
  subcategoria: string; // p. ej. "YOGURT", "PET"
  categoriaPrecios?: string;
  /** Ruta en Storage: tenants/{tenantId}/productos/{codigo}.png */
  imagenPath?: string;
}

// ---- Cliente y expedientes ----

export type TipoExpediente =
  | "instalacion"
  | "retirada"
  | "sustitucion"
  | "cambio_planograma"
  | "subida_precios"; // D22

export type EstadoExpediente =
  | "registrado"
  | "preparacion_tecnica"
  | "alta_administrativa"
  | "instalacion"
  | "alta_en_ruta"
  | "completado"
  | "cancelado";

export type TipoOferta = "publica" | "privada"; // D14

export interface Cliente {
  id: string;
  nombre: string;
  direccionInstalacion: string;
  contacto: { nombre: string; telefono: string; email: string };
}

export type TipoCanon = "sin_canon" | "fijo" | "variable" | "mixto"; // D11

export interface Canon {
  tipo: TipoCanon;
  importeFijo?: number;
  periodicidad?: "mensual" | "trimestral" | "anual";
  porcentajeVariable?: number;
  notas?: string;
}

export type TipoCondicionEspecial =
  | "cafe_facturado"
  | "combo"
  | "gratuidad_diaria"
  | "dia_gratis_anual"
  | "lote_navidad"
  | "otro"; // D10 + campo "otro" (q27)

export interface CondicionEspecial {
  tipo: TipoCondicionEspecial;
  descripcion: string;
  valor?: number;
}

export interface PropuestaInversion {
  existe: boolean;
  importe?: number;
  partidas?: { concepto: string; importe: number }[];
  respondidoPor?: string; // usuario de administración (D25)
}

export type TipoLineaCoste = "maquina" | "periferico" | "equipamiento" | "instalacion";

export interface LineaCoste {
  tipo: TipoLineaCoste;
  concepto: string;
  proveedor?: string;
  importe: number;
}

export interface Expediente {
  id: string;
  clienteId: string;
  tipo: TipoExpediente;
  tipoOferta: TipoOferta;
  estado: EstadoExpediente;
  canon: Canon;
  condicionesEspeciales: CondicionEspecial[];
  propuestaInversion: PropuestaInversion | null;
  lineasCoste: LineaCoste[];
  /** Datos de instalación que rellena el comercial (q41) */
  instalacion: {
    fechaPrevista?: string;
    contactoCliente?: string;
    requisitosUbicacion?: string;
  };
  /** Alta en ruta como texto libre (D12) */
  ruta?: { ruta: string; reponedor: string; tecnico: string };
  creadoPor: string;
  creadoEn: string;
}

// ---- Máquinas y equipamiento ----

export type Periferico = "monedero" | "lector_tarjeta" | "billetero" | "llave_privada" | "app_pago";

export interface MaquinaExpediente {
  id: string;
  modeloId: string;
  nueva: boolean;
  numeroSerie?: string; // usadas: lo registra el técnico (D21)
  numeroMonedero?: string;
  contadorServicios?: number; // D21
  perifericos: Periferico[];
  telemetria: { activa: boolean; proveedor?: string };
  estadoSolicitud?: "pendiente" | "solicitada" | "recibida"; // seguimiento D18
  fechaEntregaPrevista?: string;
}

export type TipoEquipamiento = "mueble" | "panelado" | "microondas" | "fuente_agua" | "otro";

/** Lo rellena quien inserta la oferta (D26) */
export interface Equipamiento {
  id: string;
  tipo: TipoEquipamiento;
  descripcion: string;
  proveedor: string;
  coste: number;
  estadoSolicitud: "pendiente" | "solicitado" | "recibido";
}

// ---- Planograma (D19) ----

export type TipoEspiral = "simple" | "doble" | "triple";

export interface PosicionPlanograma {
  bandeja: number;
  espiral: number;
  tipoEspiral: TipoEspiral;
  productoId?: string;
  capacidad?: number;
  precio?: number;
}

export interface Planograma {
  id: string;
  maquinaId: string;
  posiciones: PosicionPlanograma[];
  /** Selecciones de café con precio (máquinas de bebidas calientes) */
  selecciones: { numero: number; nombre: string; precio: number }[];
}

// ---- Tareas y auditoría ----

export interface Tarea {
  id: string;
  expedienteId: string;
  rolResponsable: Rol;
  titulo: string;
  estado: "pendiente" | "en_curso" | "hecha";
  fechaLimite?: string;
}

export interface EventoAuditoria {
  id: string;
  expedienteId?: string;
  usuarioId: string;
  accion: string;
  fecha: string;
  detalle?: Record<string, unknown>;
}
