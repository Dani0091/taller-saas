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
  versión?: string | null
  año?: string | null  // Guardado como string en la BD
  color?: string | null

  // Especificaciones técnicas
  kilometros?: string | null  // Guardado como string en la BD
  tipo_combustible?: TipoCombustible | null
  carroceria?: string | null
  potencia_cv?: string | null  // Guardado como string en la BD
  cilindrada?: string | null  // Guardado como string en la BD

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

export interface VehiculoFormulario extends Omit<VehiculoBase, 'taller_id' | 'año' | 'kilometros' | 'potencia_cv' | 'cilindrada'> {
  // En el formulario, los valores numéricos pueden ser number para facilitar validaciones
  año?: number | null
  kilometros?: number | null
  potencia_cv?: number | null
  cilindrada?: number | null
}

/**
 * Formulario de Vehículo Nuevo - Para crear desde cero
 */
export interface VehiculoNuevoFormulario extends Omit<VehiculoFormulario, 'id' | 'taller_id' | 'created_at' | 'updated_at'> {
  // Hereda todo de VehiculoFormulario excepto id y taller_id
}

/**
 * Formulario de Vehículo Edición - Para actualizar existente
 */
export type VehiculoEdicionFormulario = VehiculoFormulario

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
 * Convierte vehículo de BD a formulario
 */
export function vehiculoBDToFormulario(vehiculo: VehiculoBD): VehiculoFormulario {
  return {
    ...vehiculo,
    año: vehiculo.año ? toDbNumber(vehiculo.año) : null,
    kilometros: vehiculo.kilometros ? toDbNumber(vehiculo.kilometros) : null,
    potencia_cv: vehiculo.potencia_cv ? toDbNumber(vehiculo.potencia_cv) : null,
    cilindrada: vehiculo.cilindrada ? toDbNumber(vehiculo.cilindrada) : null
  }
}

/**
 * Convierte vehículo de formulario a BD (sin taller_id, que se añade aparte)
 */
export function vehiculoFormularioToBD(formulario: VehiculoFormulario): Omit<VehiculoBase, 'taller_id'> {
  return {
    ...formulario,
    año: formulario.año ? String(formulario.año) : null,
    kilometros: formulario.kilometros ? String(formulario.kilometros) : null,
    potencia_cv: formulario.potencia_cv ? String(formulario.potencia_cv) : null,
    cilindrada: formulario.cilindrada ? String(formulario.cilindrada) : null
  }
}

// Importar funciones de conversión
import { toDbNumber } from '@/lib/utils/converters'

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
// NOTA: Todos los tipos ya están exportados con la palabra clave 'export'