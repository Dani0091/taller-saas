/**
 * @fileoverview Capa de Dominio Centralizada - Tipos del Taller
 * @description Tipos consistentes para todo el sistema SaaS de talleres
 */

// ==================== TIPOS PRINCIPALES ====================

export interface Vehiculo {
  id?: string
  taller_id: string
  matricula: string
  marca?: string | null
  modelo?: string | null
  año?: number | null
  color?: string | null
  kilometros?: number | null
  tipo_combustible?: TipoCombustible | null
  carroceria?: string | null
  potencia_cv?: number | null
  cilindrada?: number | null
  vin?: string | null
  bastidor_vin?: string | null
  cliente_id?: string | null
}

export interface Cliente {
  id?: string
  taller_id: string
  nombre: string
  apellidos?: string | null
  nif?: string | null
  telefono?: string | null
  email?: string | null
  estado: 'activo' | 'inactivo'
}

export interface Orden {
  id?: string
  taller_id: string
  numero_orden?: string
  cliente_id: string
  vehiculo_id: string
  descripcion_problema?: string | null
  diagnostico?: string | null
  trabajos_realizados?: string | null
  notas?: string | null
  presupuesto_aprobado_por_cliente?: boolean
  tiempo_estimado_horas?: number
  tiempo_real_horas?: number
  subtotal_mano_obra?: number
  subtotal_piezas?: number
  iva_amount?: number
  total_con_iva?: number
  fotos_entrada?: string | null
  fotos_salida?: string | null
  fotos_diagnostico?: string | null
  nivel_combustible?: string | null
  renuncia_presupuesto?: boolean
  accion_imprevisto?: 'avisar' | 'no_hacer_nada' | 'hacer_y_facturar'
  recoger_piezas?: boolean
  danos_carroceria?: string | null
  coste_diario_estancia?: number | null
  kilometros_entrada?: number | null
  estado?: EstadoOrden
}

export interface LineaOrden {
  id?: string
  orden_id?: string
  tipo: TipoLinea
  descripcion: string
  cantidad: number
  precio_unitario: number
  estado?: 'presupuestado' | 'confirmado' | 'recibido'
  isNew?: boolean
}

// ==================== TIPOS DE FORMULARIOS (PARA UI) ====================

export type VehiculoFormulario = Omit<Vehiculo, 'id' | 'taller_id' | 'cliente_id'>
export type ClienteFormulario = Omit<Cliente, 'id' | 'taller_id'>
export type OrdenFormulario = Omit<Orden, 'id' | 'taller_id' | 'numero_orden'>
export type LineaOrdenFormulario = Omit<LineaOrden, 'id' | 'orden_id'>

// ==================== TIPOS ADICIONALES ====================

export type TipoLinea = 'mano_obra' | 'pieza' | 'servicio' | 'suplido' | 'reembolso'
export type EstadoOrden = 'recibido' | 'en_diagnostico' | 'presupuestado' | 'aprobado' | 'en_progreso' | 'finalizado' | 'facturado'
export type TipoCombustible = 'Gasolina' | 'Diésel' | 'Eléctrico' | 'Híbrido'

// ==================== UTILIDADES DE VALIDACIÓN ====================

/**
 * Función de sanitización para inputs numéricos
 */
export const sanitizeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') return defaultValue
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

/**
 * Función de sanitización para strings
 */
export const sanitizeString = (value: any, defaultValue: string = ''): string => {
  if (value === null || value === undefined) return defaultValue
  return String(value).trim()
}

/**
 * Función de validación completa para formularios (sin Zod temporalmente)
 */
export const validateForm = <T>(data: unknown): { success: boolean; data?: T; errors?: string[] } => {
  try {
    // Validación básica - reemplazar con Zod cuando esté disponible
    if (!data || typeof data !== 'object') {
      return { success: false, errors: ['Datos inválidos'] }
    }
    
    return { success: true, data: data as T }
  } catch (error) {
    return { success: false, errors: ['Error de validación desconocido'] }
  }
}

// Esquemas para validación (usaremos con Zod cuando esté instalado)
export const ValidationSchemas = {
  vehiculo: {
    required: ['matricula'],
    numberFields: ['año', 'kilometros', 'potencia_cv', 'cilindrada'],
    ranges: {
      año: { min: 1900, max: new Date().getFullYear() + 1 },
      kilometros: { min: 0 },
      potencia_cv: { min: 0 },
      cilindrada: { min: 0 }
    }
  },
  cliente: {
    required: ['nombre'],
    emailFields: ['email']
  },
  orden: {
    required: ['cliente_id', 'vehiculo_id'],
    numberFields: ['tiempo_estimado_horas', 'tiempo_real_horas', 'coste_diario_estancia', 'kilometros_entrada'],
    ranges: {
      tiempo_estimado_horas: { min: 0, max: 100 },
      tiempo_real_horas: { min: 0, max: 100 },
      coste_diario_estancia: { min: 0 },
      kilometros_entrada: { min: 0 }
    }
  },
  lineaOrden: {
    required: ['tipo', 'descripcion', 'cantidad', 'precio_unitario'],
    numberFields: ['cantidad', 'precio_unitario'],
    ranges: {
      cantidad: { min: 0.01 },
      precio_unitario: { min: 0 }
    }
  }
}

// ==================== VALORES POR DEFECTO ====================

export const DEFAULT_VALUES = {
  vehiculo: {
    marca: '',
    modelo: '',
    año: undefined,
    color: '',
    kilometros: undefined,
    tipo_combustible: 'Gasolina' as TipoCombustible,
    carroceria: '',
    potencia_cv: undefined,
    cilindrada: undefined,
    vin: '',
    bastidor_vin: '',
  } as VehiculoFormulario,

  cliente: {
    nombre: '',
    apellidos: '',
    nif: '',
    telefono: '',
    email: '',
    estado: 'activo' as const,
  } as ClienteFormulario,

  orden: {
    estado: 'recibido' as EstadoOrden,
    cliente_id: '',
    vehiculo_id: '',
    descripcion_problema: '',
    diagnostico: '',
    trabajos_realizados: '',
    notas: '',
    presupuesto_aprobado_por_cliente: false,
    tiempo_estimado_horas: 0,
    tiempo_real_horas: 0,
    subtotal_mano_obra: 0,
    subtotal_piezas: 0,
    iva_amount: 0,
    total_con_iva: 0,
    fotos_entrada: '',
    fotos_salida: '',
    fotos_diagnostico: '',
    nivel_combustible: '',
    renuncia_presupuesto: false,
    accion_imprevisto: 'avisar' as const,
    recoger_piezas: false,
    danos_carroceria: '',
    coste_diario_estancia: undefined,
    kilometros_entrada: undefined,
  } as OrdenFormulario,

  lineaOrden: {
    tipo: 'mano_obra' as TipoLinea,
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0,
    estado: 'presupuestado' as const,
    isNew: false,
  } as LineaOrdenFormulario,
}

// ==================== RESPUESTAS API ====================

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  hasMore: boolean
}