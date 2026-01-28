/**
 * @fileoverview Tipos Centralizados para Vehículos
 * @description Interfaz unificada para vehículos en todo el SaaS
 */

import type { VehiculoFormulario } from './formularios'

// Re-export para conveniencia
export type { VehiculoFormulario }

// ==================== TIPOS PRINCIPALES ====================

export interface VehiculoBase {
  // Identificación
  matricula: string
  vin?: string | null
  bastidor_vin?: string | null
  
  // Características básicas
  marca?: string | null
  modelo?: string | null
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
// NOTA: VehiculoFormulario se define en src/types/formularios.ts

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
  marca: null,
  modelo: null,
  año: new Date().getFullYear(),
  color: null,
  kilometros: 0,
  tipo_combustible: null,
  vin: null,
  carroceria: null,
  potencia_cv: null,
  cilindrada: null
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
    matricula: vehiculo.matricula,
    marca: vehiculo.marca || null,
    modelo: vehiculo.modelo || null,
    año: vehiculo.año ? toDbNumber(vehiculo.año) : new Date().getFullYear(),
    color: vehiculo.color || null,
    kilometros: vehiculo.kilometros ? toDbNumber(vehiculo.kilometros) : 0,
    tipo_combustible: vehiculo.tipo_combustible || null,
    vin: vehiculo.vin || null,
    carroceria: vehiculo.carroceria || null,
    potencia_cv: vehiculo.potencia_cv ? toDbNumber(vehiculo.potencia_cv) : null,
    cilindrada: vehiculo.cilindrada ? toDbNumber(vehiculo.cilindrada) : null
  }
}

/**
 * Convierte vehículo de formulario a BD
 */
export function vehiculoFormularioToBD(formulario: VehiculoFormulario): Omit<VehiculoBase, 'taller_id'> {
  return {
    ...formulario,
    año: formulario.año ? String(formulario.año) : null,
    kilometros: formulario.kilometros ? String(formulario.kilometros) : null,
    potencia_cv: formulario.potencia_cv ? String(formulario.potencia_cv) : null,
    cilindrada: formulario.cilindrada ? String(formulario.cilindrada) : null
  } as Omit<VehiculoBase, 'taller_id'>
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
// Todos los tipos ya están exportados directamente arriba