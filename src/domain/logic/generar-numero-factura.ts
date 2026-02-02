/**
 * @fileoverview Domain Logic: Generar Número de Factura
 * @description Lógica pura para generación de números de factura
 *
 * REGLAS DE NEGOCIO:
 * - Formato: SERIE-YYYY-NNNNNN (ej. F-2026-000123)
 * - Secuencial por serie y año
 * - Se resetea cada año
 * - Cada serie tiene su propio contador
 *
 * VENTAJA: Si mañana cambias el formato, solo modificas ESTA función
 */

import { NumeroFactura, Serie } from '@/domain/value-objects'

/**
 * Genera el siguiente número de factura para una serie y año
 */
export function generarSiguienteNumeroFactura(
  ultimoNumero?: NumeroFactura,
  serie?: Serie
): NumeroFactura {
  const añoActual = new Date().getFullYear()
  const serieActual = serie || Serie.factura()

  // Si no hay último número, es la primera factura
  if (!ultimoNumero) {
    return NumeroFactura.create(serieActual, añoActual, 1)
  }

  // Si la serie es diferente, empezar desde 1
  if (!ultimoNumero.isSerie(serieActual)) {
    return NumeroFactura.create(serieActual, añoActual, 1)
  }

  // Si cambió el año, resetear contador
  if (!ultimoNumero.isAño(añoActual)) {
    return NumeroFactura.create(serieActual, añoActual, 1)
  }

  // Incrementar contador
  return NumeroFactura.create(
    serieActual,
    añoActual,
    ultimoNumero.getSecuencial() + 1
  )
}

/**
 * Genera el siguiente número de factura desde un string
 */
export function generarSiguienteDesdeString(
  ultimoNumeroStr?: string,
  serieStr?: string
): NumeroFactura {
  const serie = serieStr ? Serie.create(serieStr) : Serie.factura()

  if (!ultimoNumeroStr) {
    return generarSiguienteNumeroFactura(undefined, serie)
  }

  const ultimoNumero = NumeroFactura.fromString(ultimoNumeroStr)
  return generarSiguienteNumeroFactura(ultimoNumero, serie)
}

/**
 * Verifica si un número de factura es válido para una serie
 */
export function isNumeroValidoParaSerie(numero: NumeroFactura, serie: Serie): boolean {
  return numero.isSerie(serie)
}
