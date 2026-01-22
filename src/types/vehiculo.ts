/**
 * @fileoverview Tipos Centralizados para Vehículos
 * @description Interfaz unificada para vehículos en todo el SaaS
 */

// ==================== TIPOS PRINCIPALES ====================

export interface VehiculoBase {
  // Identificación
  matricula: string
  vin?: string | null
  bastidor_vin?: string | null

  // Características básicas
  marca?: string | null
  modelo?: string | null
  año?: number | null  // ✅ CORRECCIÓN: Guardado como number en la BD según master-converter
  color?: string | null

  // Especificaciones técnicas
  kilometros?: number | null  // ✅ CORRECCIÓN: Guardado como number en la BD según master-converter
  tipo_combustible?: TipoCombustible | null
  carroceria?: string | null
  potencia_cv?: number | null  // ✅ CORRECCIÓN: Guardado como number en la BD según master-converter
  cilindrada?: number | null  // ✅ CORRECCIÓN: Guardado como number en la BD según master-converter

  // Relaciones
  cliente_id?: string | null
  taller_id: string

  // Estado
  estado?: EstadoVehiculo
}

export interface VehiculoBD extends VehiculoBase {
  id: string
  created_at?: string
  updated_at?: string
}

// ==================== TIPOS DE FORMULARIO ====================

// ✅ SIMPLIFICACIÓN: VehiculoFormulario ahora es igual a VehiculoBase (sin taller_id)
// Ya no necesitamos sobrescribir tipos porque todo es number | null
export interface VehiculoFormulario extends Omit<VehiculoBase, 'taller_id'> {
  // Todos los tipos ya vienen correctamente de VehiculoBase
}

// ==================== ENUMS Y TIPOS AUXILIARES ====================

export type TipoCombustible = 'Gasolina' | 'Diésel' | 'Eléctrico' | 'Híbrido' | 'Gas' | 'Otros'
export type EstadoVehiculo = 'activo' | 'inactivo' | 'vendido' | 'baja'
export type TipoCarroceria = 'Berlina' | 'SUV' | 'Compacto' | 'Monovolumen' | 'Coupe' | 'Cabrio' | 'Pickup' | 'Furgoneta' | 'Otros'

// ==================== VALIDACIONES ====================

export interface VehiculoValidations {
  matricula: {
    required: boolean
    pattern: RegExp
    minLength: number
    maxLength: number
    message: string
  }
  año: {
    min: number
    max: number
    message: string
  }
  kilometros: {
    min: number
    message: string
  }
  potencia_cv: {
    min: number
    message: string
  }
  cilindrada: {
    min: number
    message: string
  }
}

export const VehiculoValidationRules: VehiculoValidations = {
  matricula: {
    required: true,
    pattern: /^[0-9]{4}[A-Z]{3}$|^[A-Z]{3}[0-9]{4}$/,
    minLength: 6,
    maxLength: 7,
    message: 'Matrícula inválida. Formato: 1234ABC o ABC1234'
  },
  año: {
    min: 1900,
    max: new Date().getFullYear() + 1,
    message: `El año debe estar entre 1900 y ${new Date().getFullYear() + 1}`
  },
  kilometros: {
    min: 0,
    message: 'Los kilómetros no pueden ser negativos'
  },
  potencia_cv: {
    min: 0,
    message: 'La potencia no puede ser negativa'
  },
  cilindrada: {
    min: 0,
    message: 'La cilindrada no puede ser negativa'
  }
}

// ==================== VALORES POR DEFECTO ====================

export const VehiculoDefaults: VehiculoFormulario = {
  matricula: '',
  vin: '',
  bastidor_vin: '',
  marca: '',
  modelo: '',
  año: null,
  color: '',
  kilometros: null,
  tipo_combustible: null,
  carroceria: '',
  potencia_cv: null,
  cilindrada: null,
  cliente_id: null,
  estado: 'activo'
}

// ==================== OPCIONES PARA SELECTS ====================

export const TIPOS_COMBUSTIBLE_OPTIONS: { value: TipoCombustible; label: string }[] = [
  { value: 'Gasolina', label: 'Gasolina' },
  { value: 'Diésel', label: 'Diésel' },
  { value: 'Eléctrico', label: 'Eléctrico' },
  { value: 'Híbrido', label: 'Híbrido' },
  { value: 'Gas', label: 'Gas' },
  { value: 'Otros', label: 'Otros' }
]

export const TIPOS_CARROCERIA_OPTIONS: { value: TipoCarroceria; label: string }[] = [
  { value: 'Berlina', label: 'Berlina' },
  { value: 'SUV', label: 'SUV' },
  { value: 'Compacto', label: 'Compacto' },
  { value: 'Monovolumen', label: 'Monovolumen' },
  { value: 'Coupe', label: 'Coupé' },
  { value: 'Cabrio', label: 'Cabrio' },
  { value: 'Pickup', label: 'Pickup' },
  { value: 'Furgoneta', label: 'Furgoneta' },
  { value: 'Otros', label: 'Otros' }
]

export const ESTADOS_VEHICULO_OPTIONS: { value: EstadoVehiculo; label: string }[] = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'vendido', label: 'Vendido' },
  { value: 'baja', label: 'Baja' }
]

// ==================== UTILIDADES DE CONVERSIÓN ====================

/**
 * ✅ SIMPLIFICACIÓN: Ya no necesitamos conversiones porque BD y Formulario usan los mismos tipos
 * Convertir de BD a formulario es directo
 */
export function vehiculoBDToFormulario(vehiculo: VehiculoBD): VehiculoFormulario {
  return {
    ...vehiculo
  }
}

/**
 * ✅ SIMPLIFICACIÓN: Convertir de formulario a BD también es directo
 * Solo necesitamos agregar taller_id que falta en VehiculoFormulario
 */
export function vehiculoFormularioToBD(formulario: VehiculoFormulario, tallerId: string): VehiculoBase {
  return {
    ...formulario,
    taller_id: tallerId
  }
}

// ==================== INTERFACES PARA API ====================

export interface VehiculoAPIResponse {
  data: VehiculoBD[]
  count: number
  page?: number
  pageSize?: number
}

export interface VehiculoCreateRequest extends Omit<VehiculoBase, 'taller_id'> {
  cliente_id?: string
}

export interface VehiculoUpdateRequest extends Partial<VehiculoCreateRequest> {
  id: string
}

// ==================== EXPORTS ====================

export type {
  VehiculoBase,
  VehiculoBD,
  VehiculoFormulario,
  VehiculoValidations,
  VehiculoAPIResponse,
  VehiculoCreateRequest,
  VehiculoUpdateRequest
}