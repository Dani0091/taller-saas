/**
 * @fileoverview Utilidades compartidas para TallerAgil
 * @description Funciones helper reutilizables en toda la aplicación
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina clases de Tailwind CSS de forma segura
 * Utiliza clsx para condicionales y twMerge para evitar conflictos
 * @param inputs - Clases CSS a combinar
 * @returns Cadena de clases combinadas
 * @example cn('text-red-500', isActive && 'font-bold', 'p-4')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// =============================================================================
// FORMATEO DE MONEDA Y NÚMEROS
// =============================================================================

/**
 * Formatea un número como moneda en euros
 * @param amount - Cantidad a formatear
 * @param showSymbol - Si mostrar el símbolo € (default: true)
 * @returns Cadena formateada con el importe
 * @example formatCurrency(1234.5) // "1.234,50 €"
 */
export function formatCurrency(amount: number | null | undefined, showSymbol = true): string {
  const value = amount ?? 0
  const formatted = value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return showSymbol ? `${formatted} €` : formatted
}

/**
 * Formatea kilómetros con separador de miles
 * @param km - Kilómetros a formatear
 * @returns Cadena formateada con "km" al final
 * @example formatKilometers(150000) // "150.000 km"
 */
export function formatKilometers(km: number | null | undefined): string {
  if (km == null) return '—'
  return `${km.toLocaleString('es-ES')} km`
}

// =============================================================================
// FORMATEO DE FECHAS
// =============================================================================

/**
 * Formatea una fecha ISO a formato español legible
 * @param dateStr - Fecha en formato ISO (YYYY-MM-DD o ISO 8601)
 * @param includeTime - Si incluir la hora (default: false)
 * @returns Fecha formateada
 * @example formatDate('2024-01-15') // "15/01/2024"
 */
export function formatDate(dateStr: string | null | undefined, includeTime = false): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('es-ES', options)
}

/**
 * Obtiene la fecha actual en formato ISO (YYYY-MM-DD)
 * Útil para campos de formulario tipo date
 * @returns Fecha actual en formato ISO
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Calcula fecha de vencimiento (30 días desde hoy)
 * @param daysFromNow - Días desde hoy (default: 30)
 * @returns Fecha en formato ISO
 */
export function getDefaultDueDate(daysFromNow = 30): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}

// =============================================================================
// MANEJO DE FOTOS (STRINGS CSV)
// =============================================================================

/**
 * Convierte datos de fotos (pueden venir como array o string) a string CSV
 * @param fotos - Fotos en cualquier formato
 * @returns String CSV con URLs separadas por comas
 */
export function fotosToString(fotos: unknown): string {
  if (!fotos) return ''
  if (typeof fotos === 'string') return fotos
  if (Array.isArray(fotos)) return fotos.filter(Boolean).join(',')
  return ''
}

/**
 * Obtiene la URL de una foto en posición específica
 * @param fotos - String CSV de URLs de fotos
 * @param index - Índice de la foto (0-based)
 * @returns URL de la foto o string vacío
 */
export function getFotoUrl(fotos: string, index: number): string {
  if (!fotos) return ''
  const arr = fotos.split(',').map(s => s.trim()).filter(Boolean)
  return arr[index] || ''
}

/**
 * Actualiza la URL de una foto en posición específica
 * @param fotos - String CSV actual de URLs
 * @param index - Índice a actualizar
 * @param url - Nueva URL
 * @returns Nuevo string CSV con la foto actualizada
 */
export function setFotoUrl(fotos: string, index: number, url: string): string {
  const arr = fotos ? fotos.split(',').map(s => s.trim()) : []
  while (arr.length <= index) arr.push('')
  arr[index] = url
  return arr.filter(Boolean).join(',')
}

/**
 * Obtiene la URL de una foto por su clave (para fotos nombradas como diagnóstico)
 * Formato: "clave1:url1|clave2:url2"
 * @param fotos - String con el formato clave:url separado por |
 * @param key - Clave de la foto
 * @returns URL de la foto o string vacío
 */
export function getFotoByKey(fotos: string, key: string): string {
  if (!fotos) return ''
  const pairs = fotos.split('|').filter(Boolean)
  for (const pair of pairs) {
    const [k, v] = pair.split(':')
    if (k === key) return v || ''
  }
  return ''
}

/**
 * Establece la URL de una foto por su clave (para fotos nombradas)
 * Formato: "clave1:url1|clave2:url2"
 * @param fotos - String actual con formato clave:url
 * @param key - Clave de la foto
 * @param url - Nueva URL
 * @returns Nuevo string con la foto actualizada
 */
export function setFotoByKey(fotos: string, key: string, url: string): string {
  const pairs = fotos ? fotos.split('|').filter(Boolean) : []
  const map = new Map<string, string>()

  for (const pair of pairs) {
    const [k, v] = pair.split(':')
    if (k && v) map.set(k, v)
  }

  if (url) {
    map.set(key, url)
  } else {
    map.delete(key)
  }

  return Array.from(map.entries())
    .map(([k, v]) => `${k}:${v}`)
    .join('|')
}

// =============================================================================
// CÁLCULOS DE IVA
// =============================================================================

/** Porcentaje de IVA estándar en España */
export const IVA_PORCENTAJE = 21

/**
 * Calcula el IVA de una base imponible
 * @param baseImponible - Base imponible
 * @param porcentaje - Porcentaje de IVA (default: 21)
 * @returns Cantidad de IVA
 */
export function calcularIVA(baseImponible: number, porcentaje = IVA_PORCENTAJE): number {
  return baseImponible * (porcentaje / 100)
}

/**
 * Calcula el total con IVA incluido
 * @param baseImponible - Base imponible
 * @param porcentaje - Porcentaje de IVA (default: 21)
 * @returns Total con IVA
 */
export function calcularTotalConIVA(baseImponible: number, porcentaje = IVA_PORCENTAJE): number {
  return baseImponible * (1 + porcentaje / 100)
}

/**
 * Extrae la base imponible de un total con IVA
 * @param totalConIVA - Total que incluye IVA
 * @param porcentaje - Porcentaje de IVA (default: 21)
 * @returns Base imponible
 */
export function extraerBaseImponible(totalConIVA: number, porcentaje = IVA_PORCENTAJE): number {
  return totalConIVA / (1 + porcentaje / 100)
}

// =============================================================================
// VALIDACIONES
// =============================================================================

/**
 * Valida formato de NIF/CIF español
 * @param nif - NIF o CIF a validar
 * @returns true si el formato es válido
 */
export function isValidNIF(nif: string): boolean {
  if (!nif) return false
  const cleaned = nif.toUpperCase().replace(/[\s-]/g, '')
  // DNI: 8 dígitos + letra
  const dniRegex = /^[0-9]{8}[A-Z]$/
  // NIE: X/Y/Z + 7 dígitos + letra
  const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/
  // CIF: letra + 7 dígitos + control
  const cifRegex = /^[ABCDEFGHJKLMNPQRSUVW][0-9]{7}[0-9A-J]$/
  return dniRegex.test(cleaned) || nieRegex.test(cleaned) || cifRegex.test(cleaned)
}

/**
 * Valida formato de matrícula española
 * @param matricula - Matrícula a validar
 * @returns true si el formato es válido
 */
export function isValidMatricula(matricula: string): boolean {
  if (!matricula) return false
  const cleaned = matricula.toUpperCase().replace(/[\s-]/g, '')
  // Formato nuevo: 0000 BBB
  const nuevoRegex = /^[0-9]{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$/
  // Formato antiguo: XX-0000-XX
  const antiguoRegex = /^[A-Z]{1,2}[0-9]{4}[A-Z]{2}$/
  return nuevoRegex.test(cleaned) || antiguoRegex.test(cleaned)
}

/**
 * Normaliza una matrícula (sin espacios ni guiones, mayúsculas)
 * @param matricula - Matrícula a normalizar
 * @returns Matrícula normalizada
 */
export function normalizeMatricula(matricula: string): string {
  return matricula.toUpperCase().replace(/[\s-]/g, '')
}

// =============================================================================
// GENERACIÓN DE IDENTIFICADORES
// =============================================================================

/**
 * Genera un número de orden secuencial
 * @param ultimoNumero - Número de la última orden (ej: "OR-0015")
 * @returns Siguiente número de orden (ej: "OR-0016")
 */
export function generarNumeroOrden(ultimoNumero?: string): string {
  let siguiente = 1
  if (ultimoNumero) {
    const match = ultimoNumero.match(/OR-(\d+)/)
    if (match) siguiente = parseInt(match[1]) + 1
  }
  return `OR-${siguiente.toString().padStart(4, '0')}`
}

/**
 * Genera un número de factura secuencial
 * @param ultimoNumero - Número de la última factura (ej: "FA015")
 * @returns Siguiente número de factura (ej: "FA016")
 */
export function generarNumeroFactura(ultimoNumero?: string): string {
  let siguiente = 1
  if (ultimoNumero) {
    const match = ultimoNumero.match(/FA(\d+)/)
    if (match) siguiente = parseInt(match[1]) + 1
  }
  return `FA${siguiente.toString().padStart(3, '0')}`
}
