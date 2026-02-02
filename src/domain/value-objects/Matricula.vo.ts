/**
 * @fileoverview Value Object: Matrícula
 * @description Representa una matrícula de vehículo española
 *
 * REGLAS DE NEGOCIO:
 * - Formato español: 1234ABC o 1234-ABC (nuevo formato post-2000)
 * - Formato antiguo: M-1234-AB (pre-2000)
 * - Normalizado: uppercase, sin espacios, con guión
 * - Validación de caracteres permitidos
 *
 * VENTAJA: Si mañana necesitas soportar matrículas internacionales,
 * solo extiendes ESTE archivo
 */

import { ValidationError } from '@/domain/errors'

export class Matricula {
  private readonly value: string

  private constructor(value: string) {
    this.value = value.toUpperCase().trim()
  }

  /**
   * Crea una matrícula validando el formato español
   */
  public static create(value: string): Matricula {
    if (!value || !value.trim()) {
      throw new ValidationError('La matrícula no puede estar vacía', 'matricula')
    }

    // Normalizar: uppercase, sin espacios múltiples
    const normalized = value.toUpperCase().trim().replace(/\s+/g, '')

    // Validar longitud
    if (normalized.length < 4 || normalized.length > 10) {
      throw new ValidationError('Formato de matrícula inválido', 'matricula')
    }

    // Validar caracteres permitidos (letras, números y guión)
    if (!/^[A-Z0-9-]+$/.test(normalized)) {
      throw new ValidationError(
        'La matrícula solo puede contener letras, números y guión',
        'matricula'
      )
    }

    // Validar formatos españoles
    const isFormatoNuevo = /^\d{4}[A-Z]{3}$/.test(normalized) // 1234ABC
    const isFormatoNuevoConGuion = /^\d{4}-[A-Z]{3}$/.test(normalized) // 1234-ABC
    const isFormatoAntiguo = /^[A-Z]-\d{4}-[A-Z]{2}$/.test(normalized) // M-1234-AB

    if (!isFormatoNuevo && !isFormatoNuevoConGuion && !isFormatoAntiguo) {
      throw new ValidationError(
        'Formato de matrícula español no válido. Ejemplos válidos: 1234ABC, 1234-ABC, M-1234-AB',
        'matricula'
      )
    }

    // Normalizar al formato con guión si es formato nuevo sin guión
    const finalValue = isFormatoNuevo
      ? `${normalized.slice(0, 4)}-${normalized.slice(4)}`
      : normalized

    return new Matricula(finalValue)
  }

  /**
   * Crea matrícula sin validación estricta (para datos legacy o internacionales)
   */
  public static createUnsafe(value: string): Matricula {
    if (!value || !value.trim()) {
      throw new ValidationError('La matrícula no puede estar vacía', 'matricula')
    }
    return new Matricula(value.toUpperCase().trim())
  }

  /**
   * Obtiene el valor de la matrícula
   */
  public get valor(): string {
    return this.value
  }

  /**
   * Verifica si es formato nuevo (post-2000)
   */
  public isFormatoNuevo(): boolean {
    return /^\d{4}-[A-Z]{3}$/.test(this.value)
  }

  /**
   * Verifica si es formato antiguo (pre-2000)
   */
  public isFormatoAntiguo(): boolean {
    return /^[A-Z]-\d{4}-[A-Z]{2}$/.test(this.value)
  }

  /**
   * Obtiene la parte numérica de la matrícula
   */
  public getNumeros(): string {
    const match = this.value.match(/\d+/)
    return match ? match[0] : ''
  }

  /**
   * Obtiene la parte de letras de la matrícula
   */
  public getLetras(): string {
    return this.value.replace(/[0-9-]/g, '')
  }

  /**
   * Formatea la matrícula sin guiones (para búsquedas)
   */
  public formatSinGuiones(): string {
    return this.value.replace(/-/g, '')
  }

  /**
   * Formatea la matrícula con espacios (para visualización)
   */
  public formatConEspacios(): string {
    return this.value.replace(/-/g, ' ')
  }

  /**
   * Compara dos matrículas
   */
  public equals(otra: Matricula): boolean {
    // Comparar sin guiones para mayor flexibilidad
    return this.formatSinGuiones() === otra.formatSinGuiones()
  }

  /**
   * Serializa a string (para guardar en BD)
   */
  public toString(): string {
    return this.value
  }

  /**
   * Serializa a JSON
   */
  public toJSON(): string {
    return this.value
  }
}
