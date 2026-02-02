/**
 * @fileoverview Value Object: NIF/CIF/NIE
 * @description Representa un número de identificación fiscal español
 *
 * REGLAS DE NEGOCIO:
 * - Formato español: DNI (8 dígitos + letra), NIE (X/Y/Z + 7 dígitos + letra), CIF (letra + 7 dígitos + dígito/letra)
 * - Normalizado: uppercase, sin espacios, sin guiones
 * - Validación de dígito de control
 *
 * VENTAJA: Si mañana necesitas validar NIFs de otros países,
 * solo extiendes ESTE archivo
 */

import { ValidationError } from '@/domain/errors'

export class NIF {
  private readonly value: string

  private constructor(value: string) {
    this.value = value.toUpperCase().trim()
  }

  /**
   * Crea un NIF validando el formato español
   */
  public static create(value: string): NIF {
    if (!value || !value.trim()) {
      throw new ValidationError('El NIF no puede estar vacío', 'nif')
    }

    // Normalizar: uppercase, sin espacios, sin guiones
    const normalized = value.toUpperCase().trim().replace(/[\s-]/g, '')

    // Validar caracteres permitidos
    if (!/^[A-Z0-9]+$/.test(normalized)) {
      throw new ValidationError('El NIF solo puede contener letras y números', 'nif')
    }

    // Validar longitud
    if (normalized.length < 8 || normalized.length > 9) {
      throw new ValidationError('Formato de NIF inválido', 'nif')
    }

    // Intentar validar según el formato
    const isDNI = /^\d{8}[A-Z]$/.test(normalized)
    const isNIE = /^[XYZ]\d{7}[A-Z]$/.test(normalized)
    const isCIF = /^[A-W][0-9]{7}[0-9A-J]$/.test(normalized)

    if (!isDNI && !isNIE && !isCIF) {
      throw new ValidationError(
        'Formato de NIF español no válido. Ejemplos: 12345678Z (DNI), X1234567L (NIE), A12345678 (CIF)',
        'nif'
      )
    }

    // Validar dígito de control para DNI/NIE
    if (isDNI || isNIE) {
      if (!NIF.validarLetraDNI(normalized)) {
        throw new ValidationError('Letra de control del DNI/NIE incorrecta', 'nif')
      }
    }

    return new NIF(normalized)
  }

  /**
   * Crea NIF sin validación estricta (para datos legacy o extranjeros)
   */
  public static createUnsafe(value: string): NIF {
    if (!value || !value.trim()) {
      throw new ValidationError('El NIF no puede estar vacío', 'nif')
    }
    return new NIF(value.toUpperCase().trim())
  }

  /**
   * Obtiene el valor del NIF
   */
  public get valor(): string {
    return this.value
  }

  /**
   * Verifica si es un DNI
   */
  public isDNI(): boolean {
    return /^\d{8}[A-Z]$/.test(this.value)
  }

  /**
   * Verifica si es un NIE
   */
  public isNIE(): boolean {
    return /^[XYZ]\d{7}[A-Z]$/.test(this.value)
  }

  /**
   * Verifica si es un CIF
   */
  public isCIF(): boolean {
    return /^[A-W][0-9]{7}[0-9A-J]$/.test(this.value)
  }

  /**
   * Formatea el NIF con guiones (para visualización)
   * Ejemplo: 12345678Z → 12345678-Z
   */
  public format(): string {
    if (this.isDNI() || this.isNIE()) {
      return `${this.value.slice(0, -1)}-${this.value.slice(-1)}`
    }
    return this.value
  }

  /**
   * Enmascara el NIF parcialmente (RGPD)
   * Ejemplo: 12345678Z → 12***678Z
   */
  public mask(): string {
    if (this.value.length <= 4) {
      return this.value
    }
    const inicio = this.value.slice(0, 2)
    const fin = this.value.slice(-3)
    const medio = '*'.repeat(this.value.length - 5)
    return `${inicio}${medio}${fin}`
  }

  /**
   * Compara dos NIFs
   */
  public equals(otro: NIF): boolean {
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

  /**
   * Valida la letra de control de un DNI/NIE
   */
  private static validarLetraDNI(nif: string): boolean {
    const letras = 'TRWAGMYFPDXBNJZSQVHLCKE'
    let numeros: string

    // Si es NIE, convertir la letra inicial a número
    if (nif[0] === 'X') {
      numeros = '0' + nif.slice(1, -1)
    } else if (nif[0] === 'Y') {
      numeros = '1' + nif.slice(1, -1)
    } else if (nif[0] === 'Z') {
      numeros = '2' + nif.slice(1, -1)
    } else {
      numeros = nif.slice(0, -1)
    }

    const letra = nif.slice(-1)
    const indice = parseInt(numeros, 10) % 23

    return letras[indice] === letra
  }
}
