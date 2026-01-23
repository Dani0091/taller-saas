/**
 * @fileoverview Domain Logic: Calcular IVA
 * @description Funciones puras para cálculos de IVA
 *
 * REGLAS DE NEGOCIO:
 * - IVA estándar en España: 21%
 * - IVA reducido: 10%
 * - IVA superreducido: 4%
 * - El IVA viene de la configuración del taller
 *
 * VENTAJA: Si mañana cambian las reglas de IVA o añades IVA reducido
 * para ciertos servicios, solo modificas ESTAS funciones
 */

import { Precio } from '@/domain/value-objects'
import { ValidationError } from '@/domain/errors'

export interface IVAConfig {
  porcentaje: number
  tipo: 'estandar' | 'reducido' | 'superreducido' | 'exento'
}

/**
 * IVA por defecto en España
 */
export const IVA_ESTANDAR: IVAConfig = {
  porcentaje: 21,
  tipo: 'estandar'
}

export const IVA_REDUCIDO: IVAConfig = {
  porcentaje: 10,
  tipo: 'reducido'
}

export const IVA_SUPERREDUCIDO: IVAConfig = {
  porcentaje: 4,
  tipo: 'superreducido'
}

export const IVA_EXENTO: IVAConfig = {
  porcentaje: 0,
  tipo: 'exento'
}

/**
 * Calcula el IVA de un precio base
 */
export function calcularIVA(base: Precio, config: IVAConfig = IVA_ESTANDAR): Precio {
  if (config.porcentaje < 0 || config.porcentaje > 100) {
    throw new ValidationError('Porcentaje de IVA inválido', 'iva')
  }

  return base.calcularIVA(config.porcentaje)
}

/**
 * Calcula el total con IVA (base + IVA)
 */
export function calcularTotalConIVA(
  base: Precio,
  config: IVAConfig = IVA_ESTANDAR
): Precio {
  const iva = calcularIVA(base, config)
  return base.add(iva)
}

/**
 * Calcula la base imponible desde un total con IVA
 * Útil para descomponer facturas que vienen con IVA incluido
 */
export function calcularBaseDesdeTotal(
  totalConIVA: Precio,
  config: IVAConfig = IVA_ESTANDAR
): Precio {
  if (config.porcentaje === 0) {
    return totalConIVA
  }

  // Base = Total / (1 + porcentaje/100)
  const divisor = 1 + config.porcentaje / 100
  return Precio.create(totalConIVA.valor / divisor)
}

/**
 * Desglose completo de IVA
 */
export interface DesgloseIVA {
  base: Precio
  iva: Precio
  total: Precio
  porcentaje: number
  tipo: string
}

/**
 * Genera un desglose completo de IVA
 */
export function generarDesgloseIVA(
  base: Precio,
  config: IVAConfig = IVA_ESTANDAR
): DesgloseIVA {
  const iva = calcularIVA(base, config)
  const total = calcularTotalConIVA(base, config)

  return {
    base,
    iva,
    total,
    porcentaje: config.porcentaje,
    tipo: config.tipo
  }
}

/**
 * Formatea el desglose de IVA para mostrar en UI
 */
export function formatearDesgloseIVA(desglose: DesgloseIVA): {
  base: string
  iva: string
  total: string
  porcentaje: string
} {
  return {
    base: desglose.base.format(),
    iva: desglose.iva.format(),
    total: desglose.total.format(),
    porcentaje: `${desglose.porcentaje}%`
  }
}
