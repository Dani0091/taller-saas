/**
 * @fileoverview Value Object: Número de Factura
 * @description Representa un número de factura completo (serie + año + secuencial)
 *
 * REGLAS DE NEGOCIO:
 * - Formato: SERIE-YYYY-NNNNNN (ej. F-2026-000123)
 * - Serie: 1-3 caracteres
 * - Año: 4 dígitos
 * - Secuencial: 6 dígitos con padding de ceros
 *
 * VENTAJA: Si mañana cambias el formato, solo modificas ESTE archivo
 */

import { ValidationError } from '@/domain/errors'
import { Serie } from './Serie.vo'

export class NumeroFactura {
  private readonly serie: Serie
  private readonly año: number
  private readonly secuencial: number
  // Campo para datos legacy que no cumplen el formato estándar
  private readonly rawValue?: string

  private constructor(
    serie: Serie,
    año: number,
    secuencial: number,
    rawValue?: string
  ) {
    this.serie = serie
    this.año = año
    this.secuencial = secuencial
    this.rawValue = rawValue
  }

  /**
   * Crea un número de factura
   */
  public static create(serie: Serie, año: number, secuencial: number): NumeroFactura {
    // Validar año
    const añoActual = new Date().getFullYear()
    if (año < 2000 || año > añoActual + 1) {
      throw new ValidationError(`Año inválido: ${año}`, 'año')
    }

    // Validar secuencial
    if (secuencial < 1 || secuencial > 999999) {
      throw new ValidationError(`Secuencial fuera de rango: ${secuencial}`, 'secuencial')
    }

    return new NumeroFactura(serie, año, secuencial)
  }

  /**
   * Crea desde un string (parsing)
   * Ejemplo: "F-2026-000123"
   */
  public static fromString(value: string): NumeroFactura {
    const regex = /^([A-Z]+)-(\d{4})-(\d{6})$/
    const match = value.match(regex)

    if (!match) {
      throw new ValidationError(
        'Formato de número de factura inválido. Formato esperado: F-2026-000123',
        'numeroFactura'
      )
    }

    const serie = Serie.create(match[1])
    const año = parseInt(match[2], 10)
    const secuencial = parseInt(match[3], 10)

    return NumeroFactura.create(serie, año, secuencial)
  }

  /**
   * Crea desde un string con validación FLEXIBLE
   * Acepta formatos legacy y series personalizadas
   * NO lanza excepciones, solo emite warnings
   *
   * Formatos soportados:
   * - Estándar: "F-2026-000123"
   * - Serie-Numero: "SCR-123", "ALP-456", "RS-789"
   * - Legacy: "FA014", "123"
   *
   * @param value - El valor del número de factura
   * @returns NumeroFactura siempre (nunca falla)
   */
  public static fromStringFlexible(value: string): NumeroFactura {
    if (!value || !value.trim()) {
      console.warn('⚠️ Número de factura vacío, usando valores por defecto')
      return NumeroFactura.create(Serie.factura(), new Date().getFullYear(), 1)
    }

    const trimmed = value.trim()

    // Intento 1: Formato estándar SERIE-YYYY-NNNNNN (ej: "F-2026-000123")
    const regexEstandar = /^([A-Z0-9]+)-(\d{4})-(\d{1,6})$/
    const matchEstandar = trimmed.match(regexEstandar)

    if (matchEstandar) {
      try {
        const serie = Serie.createFlexible(matchEstandar[1])
        const año = parseInt(matchEstandar[2], 10)
        const secuencial = parseInt(matchEstandar[3], 10)
        return NumeroFactura.create(serie, año, secuencial)
      } catch (error) {
        console.warn(`⚠️ Error al parsear formato estándar "${trimmed}":`, error)
        // Continuar al siguiente intento
      }
    }

    // Intento 2: Formato SERIE-NUMERO (ej: "SCR-123", "ALP-456")
    const regexSerieNumero = /^([A-Z0-9]+)-(\d+)$/
    const matchSerieNumero = trimmed.match(regexSerieNumero)

    if (matchSerieNumero) {
      const serie = Serie.createFlexible(matchSerieNumero[1])
      const numero = parseInt(matchSerieNumero[2], 10)
      const añoActual = new Date().getFullYear()

      console.warn(
        `⚠️ Número de factura legacy detectado: "${trimmed}" (formato SERIE-NUMERO). ` +
        `Usando año actual ${añoActual}`
      )

      return new NumeroFactura(serie, añoActual, numero, trimmed)
    }

    // Intento 3: Formato legacy puro (ej: "FA014", "123")
    // Extraer serie (letras al inicio) y número (dígitos)
    const regexLegacy = /^([A-Z]*)(\d+)$/
    const matchLegacy = trimmed.toUpperCase().match(regexLegacy)

    if (matchLegacy) {
      const serieStr = matchLegacy[1] || 'F' // Si no hay serie, usar "F" por defecto
      const numero = parseInt(matchLegacy[2], 10)
      const serie = Serie.createFlexible(serieStr)
      const añoActual = new Date().getFullYear()

      console.warn(
        `⚠️ Número de factura legacy detectado: "${trimmed}" (formato antiguo). ` +
        `Interpretado como serie="${serieStr}", numero=${numero}`
      )

      return new NumeroFactura(serie, añoActual, numero, trimmed)
    }

    // Último recurso: guardar el valor raw tal cual
    console.warn(
      `⚠️ Número de factura con formato no reconocido: "${trimmed}". ` +
      `Guardando valor raw sin procesamiento.`
    )

    return new NumeroFactura(
      Serie.factura(),
      new Date().getFullYear(),
      1,
      trimmed // Guardar el valor original
    )
  }

  /**
   * Obtiene la serie
   */
  public getSerie(): Serie {
    return this.serie
  }

  /**
   * Obtiene el año
   */
  public getAño(): number {
    return this.año
  }

  /**
   * Obtiene el secuencial
   */
  public getSecuencial(): number {
    return this.secuencial
  }

  /**
   * Genera el siguiente número de factura (mismo año, misma serie)
   */
  public siguiente(): NumeroFactura {
    return NumeroFactura.create(this.serie, this.año, this.secuencial + 1)
  }

  /**
   * Formatea el número completo
   * Ejemplo: F-2026-000123
   * Si es un valor legacy, devuelve el valor raw original
   */
  public format(): string {
    // Si tenemos un valor raw (legacy), devolverlo tal cual
    if (this.rawValue) {
      return this.rawValue
    }

    const secuencialFormateado = this.secuencial.toString().padStart(6, '0')
    return `${this.serie.valor}-${this.año}-${secuencialFormateado}`
  }

  /**
   * Formatea de forma corta (sin padding)
   * Ejemplo: F-2026-123
   * Si es un valor legacy, devuelve el valor raw original
   */
  public formatCorto(): string {
    // Si tenemos un valor raw (legacy), devolverlo tal cual
    if (this.rawValue) {
      return this.rawValue
    }

    return `${this.serie.valor}-${this.año}-${this.secuencial}`
  }

  /**
   * Verifica si pertenece a un año específico
   */
  public isAño(año: number): boolean {
    return this.año === año
  }

  /**
   * Verifica si pertenece a una serie específica
   */
  public isSerie(serie: Serie): boolean {
    return this.serie.equals(serie)
  }

  /**
   * Compara dos números de factura
   */
  public equals(otro: NumeroFactura): boolean {
    return (
      this.serie.equals(otro.serie) &&
      this.año === otro.año &&
      this.secuencial === otro.secuencial
    )
  }

  /**
   * Verifica si este número es mayor que otro
   * (útil para ordenar facturas)
   */
  public isGreaterThan(otro: NumeroFactura): boolean {
    if (!this.serie.equals(otro.serie)) {
      return this.serie.valor > otro.serie.valor
    }

    if (this.año !== otro.año) {
      return this.año > otro.año
    }

    return this.secuencial > otro.secuencial
  }

  /**
   * Serializa a string (para guardar en BD)
   */
  public toString(): string {
    return this.format()
  }

  /**
   * Serializa a JSON
   */
  public toJSON(): string {
    return this.format()
  }
}
