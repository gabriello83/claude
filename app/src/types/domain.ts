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

export interface Destinos {
  para: string[];
  cc: string[];
}

export interface TenantConfig {
  nombre: string;
  /** Nombre comercial/fiscal de la empresa operadora (D31) */
  nombreEmpresa?: string;
  idioma: Idioma;
  /**
   * Direcciones NACIONALES por tipo de correo (D23, q37, D31). Sirven de
   * valor por defecto cuando una delegación no define ese tipo (p. ej. taller
   * nacional): la delegación hereda estas direcciones.
   */
  correos: Partial<Record<TipoCorreo, Destinos>>;
  /** Módulos licenciables activos (D19) */
  modulos: { planograma: boolean };
}

/** Delegación de la empresa (D31): correos propios que sobrescriben los nacionales */
export interface Delegacion {
  id: string;
  nombre: string;
  /** Sobrescrituras por tipo de correo; lo que no se define hereda del nivel nacional */
  correos: Partial<Record<TipoCorreo, Destinos>>;
}

/**
 * Fabricante/proveedor de máquinas con su correo (D31). Se enrutan por él la
 * solicitud a proveedor y el planograma al fabricante. El ID del documento es
 * la marca del catálogo (NECTA, AZKOYEN…) para casar por máquina.
 */
export interface Fabricante {
  id: string;
  marca: string;
  email: string;
  contacto?: string;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  roles: Rol[]; // multi-rol (D17)
  /** Delegación a la que pertenece (D31); vacío en admin/dirección (ven todo) */
  delegacionId?: string;
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
  | "ejecucion" // intervención en retiradas, sustituciones y cambios (D22)
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

/** Tarea embebida en el expediente; "titulo" es una clave i18n */
export interface TareaExpediente {
  id: string;
  rolResponsable: Rol;
  titulo: string;
  estado: "pendiente" | "hecha";
  paso: EstadoExpediente;
}

export interface Expediente {
  id: string;
  clienteId: string;
  /** Desnormalizado para listados */
  clienteNombre: string;
  /** Delegación que gestiona el expediente (D31); base del aislamiento y del enrutado de correos internos */
  delegacionId: string;
  delegacionNombre: string;
  tipo: TipoExpediente;
  tipoOferta: TipoOferta;
  estado: EstadoExpediente;
  canon: Canon;
  condicionesEspeciales: CondicionEspecial[];
  propuestaInversion: PropuestaInversion | null;
  lineasCoste: LineaCoste[];
  tareas: TareaExpediente[];
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

// ---- Tarifas (D8, D20, D30) ----

/** Cuatro precios por línea (D30). El redondeo a 0,05 € solo aplica al efectivo. */
export interface PreciosCanales {
  efectivo: number;
  tarjetaEmpleado: number;
  tarjetaBancaria: number;
  app: number;
}

export interface LineaTarifa {
  tipo: "producto" | "seleccion";
  /** Código de artículo del catálogo, o nº de selección de café */
  codigo: string;
  nombre: string;
  precios: PreciosCanales;
  /** Café gratuito para el usuario: precio que se factura al cliente (D10) */
  precioFacturadoCliente?: number;
  franjaHoraria?: string; // D20
  colectivo?: string; // D20
}

export interface ComboTarifa {
  nombre: string;
  codigos: string[];
  precios: PreciosCanales;
}

export interface Tarifa {
  id: string;
  nombre: string;
  clienteId?: string;
  clienteNombre?: string;
  vigenteDesde: string;
  vigenteHasta?: string;
  lineas: LineaTarifa[];
  combos: ComboTarifa[];
  condiciones: CondicionEspecial[];
  /** ID de la tarifa origen si es una revisión (IPC, D20) */
  revisionDe?: string;
  creadoEn: string;
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

export interface SeleccionPlanograma {
  numero: number;
  nombre: string;
  precio: number;
}

export interface Planograma {
  id: string;
  maquinaId: string;
  modeloId: string;
  posiciones: PosicionPlanograma[];
  /** Selecciones de café con precio (máquinas de bebidas calientes) */
  selecciones: SeleccionPlanograma[];
}

/** Plantilla reutilizable por modelo y tipo de cliente (D19/q23) */
export interface PlantillaPlanograma {
  id: string;
  nombre: string;
  modeloId: string;
  tipoCliente?: string; // oficina, hospital, fábrica…
  posiciones: PosicionPlanograma[];
  selecciones: SeleccionPlanograma[];
}

// ---- Auditoría ----

export interface EventoAuditoria {
  id: string;
  expedienteId?: string;
  usuarioId: string;
  accion: string;
  fecha: string;
  detalle?: Record<string, unknown>;
}
