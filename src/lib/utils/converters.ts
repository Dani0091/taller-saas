/**
 * @fileoverview Utilidades de Conversión de Tipos
 * @description Funciones seguras para conversión entre string/number en formularios
 */

// ==================== CONVERSORES A BASE DE DATOS ====================

/**
 * Convierte valor del formulario a número para guardar en BD
 * @param value Valor del input (puede ser string, number, null, undefined)
 * @param defaultValue Valor por defecto si la conversión falla
 * @returns número seguro para BD
 */
export function toDbNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') return defaultValue
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

/**
 * Convierte valor del formulario a string para guardar en BD
 * @param value Valor del input (puede ser number, string, null, undefined)
 * @param defaultValue Valor por defecto si la conversión falla
 * @returns string seguro para BD
 */
export function toDbString(value: any, defaultValue: string = ''): string {
  if (value === null || value === undefined) return defaultValue
  return String(value).trim()
}

/**
 * Convierte valor del formulario a boolean para guardar en BD
 * @param value Valor del input (puede ser boolean, string, number, null, undefined)
 * @param defaultValue Valor por defecto si la conversión falla
 * @returns boolean seguro para BD
 */
export function toDbBoolean(value: any, defaultValue: boolean = false): boolean {
  if (value === null || value === undefined) return defaultValue
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1' || value === 'on'
  }
  if (typeof value === 'number') return value !== 0
  return defaultValue
}

// ==================== CONVERSORES A FORMULARIO ====================

/**
 * Convierte valor de BD a string para mostrar en formulario
 * @param value Valor de BD (puede ser number, string, null, undefined)
 * @param defaultValue Valor por defecto
 * @returns string seguro para formulario
 */
export function toFormString(value: any, defaultValue: string = ''): string {
  if (value === null || value === undefined) return defaultValue
  return String(value)
}

/**
 * Convierte valor de BD a number para mostrar en formulario
 * @param value Valor de BD (puede ser number, string, null, undefined)
 * @param defaultValue Valor por defecto
 * @returns number o undefined para formulario
 */
export function toFormNumber(value: any, defaultValue?: number): number | undefined {
  if (value === null || value === undefined || value === '') return defaultValue
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

// ==================== UTILIDADES DE SANITIZACIÓN ====================

/**
 * Limpia string para mantener solo dígitos (útil para teléfono, DNI, etc.)
 * @param value String a limpiar
 * @returns String con solo dígitos
 */
export function sanitizeDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Limpia string para formato de matrícula española
 * @param value String a limpiar
 * @returns String formateado (ej: "1234ABC")
 */
export function sanitizeMatricula(value: string): string {
  // Eliminar espacios y caracteres especiales, conservar números y letras
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Limpia string para formato de email
 * @param value String a limpiar
 * @returns String en minúsculas sin espacios
 */
export function sanitizeEmail(value: string): string {
  return value.toLowerCase().trim()
}

/**
 * Limpia string para nombres y apellidos
 * @param value String a limpiar
 * @returns String con solo letras y espacios básicos
 */
export function sanitizeNombre(value: string): string {
  return value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s'-]/g, '').trim()
}

/**
 * Limpia valor numérico para kilómetros o distancias
 * @param value Valor a limpiar
 * @returns Número limpio o 0
 */
export function sanitizeKilometros(value: any): number {
  if (value === null || value === undefined || value === '') return 0
  const cleanStr = String(value).replace(/[^\d.]/g, '')
  const num = Number(cleanStr)
  return isNaN(num) ? 0 : Math.max(0, num)
}

/**
 * Limpia valor numérico para años
 * @param value Valor a limpiar
 * @param currentYear Año actual para validación
 * @returns Año limpio o undefined
 */
export function sanitizeAño(value: any, currentYear: number = new Date().getFullYear()): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const cleanStr = String(value).replace(/\D/g, '')
  const año = Number(cleanStr)
  
  if (isNaN(año)) return undefined
  if (año < 1900 || año > currentYear + 1) return undefined
  
  return año
}

/**
 * Limpia valor numérico para precios
 * @param value Valor a limpiar
 * @returns Precio limpio o 0
 */
export function sanitizePrecio(value: any): number {
  if (value === null || value === undefined || value === '') return 0
  // Permitir decimales con punto o coma
  const cleanStr = String(value).replace(/[^\d.,]/g, '').replace(',', '.')
  const precio = Number(cleanStr)
  return isNaN(precio) ? 0 : Math.max(0, precio)
}

// ==================== VALIDADORES DE TIPOS ====================

/**
 * Verifica si un valor es un número válido
 * @param value Valor a verificar
 * @returns true si es número válido
 */
export function isValidNumber(value: any): boolean {
  return !isNaN(Number(value)) && value !== null && value !== undefined && value !== ''
}

/**
 * Verifica si un valor es un email válido
 * @param value Valor a verificar
 * @returns true si es email válido
 */
export function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

/**
 * Verifica si una matrícula española es válida
 * @param value Matrícula a verificar
 * @returns true si es matrícula válida
 */
export function isValidMatricula(value: string): boolean {
  // Formato: 1234ABC o ABC1234
  const matriculaRegex = /^[0-9]{4}[A-Z]{3}$|^[A-Z]{3}[0-9]{4}$/
  return matriculaRegex.test(sanitizeMatricula(value))
}

// ==================== UTILIDADES DE MANEJO DE ESTADOS ====================

/**
 * Manejador seguro para cambios en inputs numéricos
 * @param setter Función setState del formulario
 * @param fieldName Nombre del campo
 * @param defaultValue Valor por defecto
 * @returns Función optimizada para onChange
 */
export function createNumericHandler<T>(
  setter: React.Dispatch<React.SetStateAction<T>>,
  fieldName: keyof T,
  defaultValue: number = 0
) {
  return (value: any) => {
    const sanitized = toDbNumber(value, defaultValue)
    setter(prev => ({
      ...prev,
      [fieldName]: sanitized
    }))
  }
}

/**
 * Manejador seguro para cambios en inputs de texto
 * @param setter Función setState del formulario
 * @param fieldName Nombre del campo
 * @param sanitizer Función de sanitización opcional
 * @returns Función optimizada para onChange
 */
export function createTextHandler<T>(
  setter: React.Dispatch<React.SetStateAction<T>>,
  fieldName: keyof T,
  sanitizer?: (value: string) => string
) {
  return (value: any) => {
    const sanitized = sanitizer 
      ? sanitizer(String(value)) 
      : toDbString(value)
    
    setter(prev => ({
      ...prev,
      [fieldName]: sanitized
    }))
  }
}

// ==================== EXPORTS POR DEFECTO ====================

export default {
  // Conversores a BD
  toDbNumber,
  toDbString,
  toDbBoolean,
  
  // Conversores a formulario
  toFormString,
  toFormNumber,
  
  // Sanitización
  sanitizeDigits,
  sanitizeMatricula,
  sanitizeEmail,
  sanitizeNombre,
  sanitizeKilometros,
  sanitizeAño,
  sanitizePrecio,
  
  // Validación
  isValidNumber,
  isValidEmail,
  isValidMatricula,
  
  // Manejadores de estado
  createNumericHandler,
  createTextHandler
}