/**
 * @fileoverview Value Object: VIN
 * @description Representa un VIN (Vehicle Identification Number) válido
 *
 * REGLAS DE NEGOCIO:
 * - 17 caracteres exactos (estándar ISO 3779)
 * - Solo letras mayúsculas y números
 * - NO puede contener las letras I, O, Q (confusión con 1 y 0)
 * - Validación de dígito de control (opcional, solo para VINs norteamericanos)
 *
 * VENTAJA: Garantiza que el VIN sea válido antes de guardar en BD
 */

import { ValidationError } from '@/domain/errors'

export class VIN {
  private readonly value: string

  private constructor(value: string) {
    this.value = value.toUpperCase()
  }

  /**
   * Crea un VIN validando el formato ISO 3779
   */
  public static create(value: string): VIN {
    if (!value || !value.trim()) {
      throw new ValidationError('El VIN no puede estar vacío', 'vin')
    }

    // Normalizar: eliminar espacios y convertir a mayúsculas
    const normalized = value.trim().replace(/\s/g, '').toUpperCase()

    // Validar longitud exacta (17 caracteres)
    if (normalized.length !== 17) {
      throw new ValidationError('El VIN debe tener exactamente 17 caracteres', 'vin')
    }

    // Validar que solo contenga letras y números (alfanumérico)
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalized)) {
      throw new ValidationError(
        'El VIN solo puede contener letras (excepto I, O, Q) y números',
        'vin'
      )
    }

    // Validar que no contenga letras prohibidas (I, O, Q)
    if (/[IOQ]/.test(normalized)) {
      throw new ValidationError(
        'El VIN no puede contener las letras I, O o Q (se confunden con 1 y 0)',
        'vin'
      )
    }

    return new VIN(normalized)
  }

  /**
   * Crea VIN sin validación estricta (para datos legacy)
   */
  public static createUnsafe(value: string): VIN {
    if (!value || !value.trim()) {
      throw new ValidationError('El VIN no puede estar vacío', 'vin')
    }
    const normalized = value.trim().toUpperCase()
    return new VIN(normalized)
  }

  /**
   * Intenta crear un VIN, retorna null si es inválido
   */
  public static createOrNull(value: string | null | undefined): VIN | null {
    if (!value) return null
    try {
      return VIN.create(value)
    } catch {
      return null
    }
  }

  /**
   * Obtiene el valor del VIN
   */
  public get valor(): string {
    return this.value
  }

  /**
   * Obtiene el WMI (World Manufacturer Identifier) - primeros 3 caracteres
   * Identifica al fabricante
   */
  public getWMI(): string {
    return this.value.substring(0, 3)
  }

  /**
   * Obtiene el VDS (Vehicle Descriptor Section) - caracteres 4-9
   * Describe el tipo de vehículo
   */
  public getVDS(): string {
    return this.value.substring(3, 9)
  }

  /**
   * Obtiene el VIS (Vehicle Identifier Section) - caracteres 10-17
   * Identifica el vehículo específico
   */
  public getVIS(): string {
    return this.value.substring(9, 17)
  }

  /**
   * Obtiene el año del modelo (carácter 10)
   * NOTA: Código letra/número que representa el año
   */
  public getCodigoAño(): string {
    return this.value[9]
  }

  /**
   * Obtiene la planta de fabricación (carácter 11)
   */
  public getCodigoPlanta(): string {
    return this.value[10]
  }

  /**
   * Obtiene el número de serie (últimos 6 caracteres)
   */
  public getNumeroSerie(): string {
    return this.value.substring(11, 17)
  }

  /**
   * Verifica si es un VIN europeo (WMI comienza con S-Z)
   */
  public isEuropeo(): boolean {
    const primerCaracter = this.value[0]
    return primerCaracter >= 'S' && primerCaracter <= 'Z'
  }

  /**
   * Verifica si es un VIN norteamericano (WMI comienza con 1-5)
   */
  public isNorteamericano(): boolean {
    const primerCaracter = this.value[0]
    return primerCaracter >= '1' && primerCaracter <= '5'
  }

  /**
   * Verifica si es un VIN asiático (WMI comienza con J-R)
   */
  public isAsiatico(): boolean {
    const primerCaracter = this.value[0]
    return primerCaracter >= 'J' && primerCaracter <= 'R'
  }

  /**
   * Formatea el VIN con espacios para legibilidad
   * Ejemplo: WVWZZZ1JZXW123456 -> WVW ZZZ 1JZ XW 123456
   */
  public format(): string {
    return `${this.value.substring(0, 3)} ${this.value.substring(3, 6)} ${this.value.substring(6, 9)} ${this.value.substring(9, 11)} ${this.value.substring(11)}`
  }

  /**
   * Enmascara el VIN para privacidad (GDPR)
   * Muestra solo los primeros 3 y últimos 4 caracteres
   * Ejemplo: WVWZZZ1JZXW123456 -> WVW**********3456
   */
  public mask(): string {
    const inicio = this.value.substring(0, 3)
    const fin = this.value.substring(13)
    return `${inicio}**********${fin}`
  }

  /**
   * Compara dos VINs
   */
  public equals(otro: VIN): boolean {
    return this.value === otro.value
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
