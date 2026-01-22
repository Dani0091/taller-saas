/**
 * @fileoverview Función Maestra de Conversión Anti-Errores
 * @description Sistema centralizado para manejar TODOS los conflictos de datos en SaaS de Talleres
 */

// ==================== TIPOS CENTRALIZADOS DE BASES DE DATOS ====================

/**
 * Interface unificada para campos problemáticos
 * Esta interfaz define cómo deben ser los datos en la BD
 */
export interface DatabaseSchema {
  // Campos que siempre causan problemas
  kilometros: number | null
  año: number | null
  precio: number | null
  tarifa: number | null
  potencia_cv: number | null
  cilindrada: number | null
  
  // Campos que pueden ser problemáticos
  telefono: string | null
  matricula: string
  vin: string
  
  // Campos financieros
  base_imponible: number
  iva_amount: number
  total_con_iva: number
}

// ==================== UTILIDAD MAESTRA DE CONVERSIÓN ====================

/**
 * Función maestra que resuelve TODOS los conflictos de tipos
 * @param value Valor del input (puede venir de cualquier fuente)
 * @param fieldType Tipo de campo según el patrón SaaS de talleres
 * @param options Opciones específicas del campo
 * @returns Valor seguro para guardar en base de datos
 */
export function masterConverter(
  value: any, 
  fieldType: keyof DatabaseSchema,
  options: {
    allowDecimals?: boolean
    min?: number
    max?: number
    required?: boolean
    sanitize?: boolean
  } = {}
): any {
  
  const {
    allowDecimals = false,
    min,
    max,
    required = false,
    sanitize = true
  } = options

  // Si es null/undefined y no es requerido, devolver null
  if (value === null || value === undefined || value === '') {
    return required ? (allowDecimals ? 0 : 0) : null
  }

  // Convertir a string primero para sanitización
  let cleanValue = String(value).trim()

  // Sanitización específica por tipo de campo
  if (sanitize) {
    cleanValue = sanitizeByFieldType(cleanValue, fieldType)
  }

  // Conversión según el tipo esperado en la BD
  switch (fieldType) {
    case 'kilometros':
      return convertKilometros(cleanValue, min)
    
    case 'año':
      return convertAño(cleanValue, min, max)
    
    case 'precio':
    case 'tarifa':
    case 'base_imponible':
    case 'iva_amount':
    case 'total_con_iva':
      return convertPrecio(cleanValue, min)
    
    case 'potencia_cv':
      return convertPotencia(cleanValue, min)
    
    case 'cilindrada':
      return convertCilindrada(cleanValue, min)
    
    case 'telefono':
      return convertTelefono(cleanValue)
    
    case 'matricula':
      return convertMatricula(cleanValue)
    
    case 'vin':
      return convertVIN(cleanValue)
    
    default:
      return cleanValue
  }
}

// ==================== FUNCIONES ESPECIALIZADAS POR CAMPO ====================

/**
 * Conversión robusta para kilómetros
 * Maneja: "120.000", "120000", "120k", "120 km"
 */
function convertKilometros(value: string, min?: number): number | null {
  if (!value) return null
  
  // Eliminar todo excepto números y punto decimal
  let clean = value.replace(/[^\d.]/g, '')
  
  // Manejar "120k" -> "120000"
  if (clean.includes('k')) {
    clean = clean.replace('k', '000')
  }
  
  const km = parseFloat(clean)
  
  if (isNaN(km)) return null
  if (min !== undefined && km < min) return min
  if (km < 0) return null
  
  return Math.floor(km) // Siempre entero para kilómetros
}

/**
 * Conversión robusta para año
 * Maneja: "2024", "'24", "24", etc.
 */
function convertAño(value: string, min?: number, max?: number): number | null {
  if (!value) return null
  
  let clean = value.replace(/[^\d]/g, '')
  
  // Si son 2 dígitos, asumir siglo 20
  if (clean.length === 2) {
    const year2000 = parseInt('20' + clean)
    const year1900 = parseInt('19' + clean)
    const currentYear = new Date().getFullYear()
    
    // Elegir el más cercano al año actual
    clean = Math.abs(year2000 - currentYear) < Math.abs(year1900 - currentYear) 
      ? String(year2000) 
      : String(year1900)
  }
  
  const año = parseInt(clean)
  
  if (isNaN(año)) return null
  if (min !== undefined && año < min) return null
  if (max !== undefined && año > max) return null
  if (año < 1900 || año > new Date().getFullYear() + 1) return null
  
  return año
}

/**
 * Conversión robusta para precios
 * Maneja: "1.200,50", "1200.50", "$1200.50", "1,200.50"
 */
function convertPrecio(value: string, min?: number): number {
  if (!value) return 0
  
  // Eliminar símbolos de moneda y espacios
  let clean = value.replace(/[€$\s]/g, '')
  
  // Manejar separadores decimales españoles (coma) y americanos (punto)
  clean = clean.replace(/\./g, '') // Eliminar separadores de miles
  clean = clean.replace(/,/, '.') // Convertir coma decimal a punto
  
  const precio = parseFloat(clean)
  
  if (isNaN(precio)) return 0
  if (min !== undefined && precio < min) return min
  if (precio < 0) return 0
  
  // Redondear a 2 decimales
  return Math.round(precio * 100) / 100
}

/**
 * Conversión robusta para potencia (CV)
 * Maneja: "110cv", "110 CV", "110hp", etc.
 */
function convertPotencia(value: string, min?: number): number | null {
  if (!value) return null
  
  // Eliminar "cv", "hp", y otros sufijos
  let clean = value.replace(/[cchpvps]/gi, '').replace(/\s/g, '')
  
  const potencia = parseFloat(clean)
  
  if (isNaN(potencia)) return null
  if (min !== undefined && potencia < min) return null
  if (potencia < 0) return null
  
  return potencia
}

/**
 * Conversión robusta para cilindrada
 * Maneja: "1998cc", "1998 cc", "2.0l", "2000", etc.
 */
function convertCilindrada(value: string, min?: number): number | null {
  if (!value) return null
  
  // Eliminar "cc", "l", y otros sufijos
  let clean = value.replace(/[ccll]/gi, '').replace(/\s/g, '')
  
  // Si es en litros (ej: "2.0"), convertir a cc
  if (parseFloat(clean) < 10) {
    clean = String(parseFloat(clean) * 1000)
  }
  
  const cilindrada = parseInt(clean)
  
  if (isNaN(cilindrada)) return null
  if (min !== undefined && cilindrada < min) return null
  if (cilindrada < 0) return null
  
  return cilindrada
}

/**
 * Conversión robusta para teléfono
 * Maneja: "+34 600 123 456", "600123456", "600-123-456"
 */
function convertTelefono(value: string): string | null {
  if (!value) return null
  
  // Eliminar todo excepto números y +
  let clean = value.replace(/[^\d+]/g, '')
  
  // Si empieza con 34 (España) pero sin +, añadirlo
  if (clean.startsWith('34') && !clean.startsWith('+34')) {
    clean = '+34' + clean.substring(2)
  }
  
  // Si no tiene + y es español, añadir +34
  if (!clean.startsWith('+') && clean.startsWith('6') && clean.length === 9) {
    clean = '+34' + clean
  }
  
  return clean || null
}

/**
 * Conversión robusta para matrícula española
 * Maneja: "1234 ABC", "1234ABC", "1234-ABC"
 */
function convertMatricula(value: string): string {
  if (!value) return ''
  
  // Eliminar espacios y guiones, convertir a mayúsculas
  let clean = value.replace(/[\s-]/g, '').toUpperCase()
  
  // Validar formato básico español
  const regex = /^[0-9]{4}[A-Z]{3}$|^[A-Z]{3}[0-9]{4}$/
  
  // Si no coincide, devolver el limpio igualmente (validación se hace en otro lugar)
  return clean
}

/**
 * Conversión robusta para VIN
 * Maneja: VINs con espacios, guiones bajos, etc.
 */
function convertVIN(value: string): string {
  if (!value) return ''
  
  // Eliminar espacios y caracteres especiales, mantener alfanuméricos
  return value.replace(/[^A-Z0-9]/gi, '').toUpperCase()
}

// ==================== SANITIZACIÓN POR TIPO DE CAMPO ====================

function sanitizeByFieldType(value: string, fieldType: keyof DatabaseSchema): string {
  switch (fieldType) {
    case 'kilometros':
    case 'año':
    case 'precio':
    case 'tarifa':
    case 'potencia_cv':
    case 'cilindrada':
      return value.replace(/[^\d.,]/g, '')
    
    case 'telefono':
      return value.replace(/[^\d+\s-]/g, '')
    
    case 'matricula':
      return value.replace(/[^A-Z0-9\s-]/gi, '').toUpperCase()
    
    case 'vin':
      return value.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    
    default:
      return value.trim()
  }
}

// ==================== HOOKS DE REACT INTEGRADOS ====================

/**
 * Hook para crear manejadores de cambios master
 * Uso: const handleChange = useMasterConverter(setFormData)
 */
export function useMasterConverter<T extends Record<string, any>>(
  setter: React.Dispatch<React.SetStateAction<T>>,
  fieldConfig?: Record<keyof T, keyof DatabaseSchema>
) {
  return (fieldName: keyof T, value: any, options?: any) => {
    const dbField = fieldConfig?.[fieldName] as keyof DatabaseSchema
    
    if (dbField) {
      const convertedValue = masterConverter(value, dbField, options)
      setter(prev => ({
        ...prev,
        [fieldName]: convertedValue
      }))
    } else {
      // Para campos no numéricos, comportamiento normal
      setter(prev => ({
        ...prev,
        [fieldName]: value
      }))
    }
  }
}

// ==================== VALIDACIÓN ANTES DE ENVÍO ====================

/**
 * Función para validar objeto completo antes de enviar a BD
 * Uso: const validation = validateForDatabase(formData, vehicleSchema)
 */
export function validateForDatabase(
  data: Record<string, any>,
  schema: Record<string, keyof DatabaseSchema>
): { 
  valid: boolean 
  errors: string[]
  sanitized: Record<string, any> 
} {
  const errors: string[] = []
  const sanitized: Record<string, any> = {}

  Object.entries(schema).forEach(([field, dbField]) => {
    const value = data[field]
    const convertedValue = masterConverter(value, dbField)

    // Validaciones específicas
    if (dbField === 'matricula' && !convertedValue) {
      errors.push('La matrícula es obligatoria')
    }

    if (dbField === 'kilometros' && convertedValue !== null && convertedValue < 0) {
      errors.push('Los kilómetros no pueden ser negativos')
    }

    sanitized[field] = convertedValue
  })

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  }
}

// ==================== ESQUEMAS PREDEFINIDOS ====================

export const SCHEMAS = {
  vehiculo: {
    matricula: 'matricula' as const,
    año: 'año' as const,
    kilometros: 'kilometros' as const,
    marca: null, // Campo de texto normal
    modelo: null,
    potencia_cv: 'potencia_cv' as const,
    cilindrada: 'cilindrada' as const,
    vin: 'vin' as const,
  },

  orden: {
    kilometros_entrada: 'kilometros' as const,
    tiempo_estimado_horas: 'precio' as const,
    tiempo_real_horas: 'precio' as const,
    coste_diario_estancia: 'precio' as const,
  },

  factura: {
    base_imponible: 'base_imponible' as const,
    iva_amount: 'iva_amount' as const,
    total_con_iva: 'total_con_ira' as const,
  },

  linea_orden: {
    cantidad: 'precio' as const,
    precio_unitario: 'precio' as const,
  }
}

// ==================== EXPORTS ====================

export default masterConverter
export {
  convertKilometros,
  convertAño,
  convertPrecio,
  convertPotencia,
  convertCilindrada,
  convertTelefono,
  convertMatricula,
  convertVIN
}