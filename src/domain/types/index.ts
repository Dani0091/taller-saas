/**
 * @fileoverview Tipos de Dominio
 * @description Tipos y enums del dominio de negocio
 * Sin dependencias externas (puro TypeScript)
 */

// ==================== ENUMS DE DOMINIO ====================

export enum EstadoOrden {
  RECIBIDO = 'recibido',
  EN_DIAGNOSTICO = 'en_diagnostico',
  PRESUPUESTADO = 'presupuestado',
  APROBADO = 'aprobado',
  EN_PROGRESO = 'en_progreso',
  FINALIZADO = 'finalizado',
  FACTURADO = 'facturado'
}

export enum TipoLinea {
  MANO_OBRA = 'mano_obra',
  PIEZA = 'pieza',
  SERVICIO = 'servicio',
  SUPLIDO = 'suplido',
  REEMBOLSO = 'reembolso'
}

export enum EstadoLineaOrden {
  PRESUPUESTADO = 'presupuestado',
  CONFIRMADO = 'confirmado',
  RECIBIDO = 'recibido'
}

export enum TipoCombustible {
  GASOLINA = 'Gasolina',
  DIESEL = 'Diésel',
  ELECTRICO = 'Eléctrico',
  HIBRIDO = 'Híbrido',
  GAS = 'Gas',
  OTRO = 'Otro'
}

export enum EstadoCliente {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo'
}

export enum AccionImprevisto {
  AVISAR = 'avisar',
  NO_HACER_NADA = 'no_hacer_nada',
  HACER_Y_FACTURAR = 'hacer_y_facturar'
}

// ==================== INTERFACES BASE ====================

/**
 * Propiedades comunes a todas las entidades
 */
export interface BaseEntity {
  id: string
  tallerId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Propiedades para auditoría
 */
export interface Auditable {
  createdBy?: string
  updatedBy?: string
  deletedAt?: Date
  deletedBy?: string
}

/**
 * Propiedades para soft delete
 */
export interface SoftDeletable {
  deletedAt?: Date
  deletedBy?: string
}
