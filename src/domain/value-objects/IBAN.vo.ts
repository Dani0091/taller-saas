/**
 * @fileoverview Value Object: IBAN
 * @description Representa un IBAN (International Bank Account Number) válido
 *
 * REGLAS DE NEGOCIO:
 * - Formato válido según ISO 13616
 * - Validación de dígitos de control
 * - Normalizado: sin espacios, mayúsculas
 * - Longitud válida por país (España: 24 caracteres)
 *
 * VENTAJA: Garantiza que el IBAN sea válido antes de guardar en BD
 */

import { ValidationError } from '@/domain/errors'

export class IBAN {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  /**
   * Crea un IBAN validando el formato y dígitos de control
   */
  public static create(value: string): IBAN {
    if (!value || !value.trim()) {
      throw new ValidationError('El IBAN no puede estar vacío', 'iban')
    }

    // Normalizar: eliminar espacios y convertir a mayúsculas
    const normalized = value.trim().replace(/\s/g, '').toUpperCase()

    // Validar formato básico (comienza con 2 letras + 2 dígitos)
    if (!/^[A-Z]{2}\d{2}/.test(normalized)) {
      throw new ValidationError('Formato de IBAN inválido. Debe comenzar con código de país y dígitos de control', 'iban')
    }

    // Validar longitud (varía por país)
    const longitudesPorPais: Record<string, number> = {
      ES: 24, // España
      FR: 27, // Francia
      DE: 22, // Alemania
      IT: 27, // Italia
      PT: 25, // Portugal
      GB: 22, // Reino Unido
      NL: 18, // Países Bajos
      BE: 16  // Bélgica
    }

    const codigoPais = normalized.substring(0, 2)
    const longitudEsperada = longitudesPorPais[codigoPais]

    if (longitudEsperada && normalized.length !== longitudEsperada) {
      throw new ValidationError(
        `El IBAN de ${codigoPais} debe tener ${longitudEsperada} caracteres`,
        'iban'
      )
    }

    // Validar que el resto sean caracteres alfanuméricos
    if (!/^[A-Z0-9]+$/.test(normalized)) {
      throw new ValidationError('El IBAN solo puede contener letras y números', 'iban')
    }

    // Validar dígitos de control
    if (!this.validarDigitosControl(normalized)) {
      throw new ValidationError('Los dígitos de control del IBAN son incorrectos', 'iban')
    }

    return new IBAN(normalized)
  }

  /**
   * Crea IBAN sin validación estricta (para datos legacy)
   */
  public static createUnsafe(value: string): IBAN {
    if (!value || !value.trim()) {
      throw new ValidationError('El IBAN no puede estar vacío', 'iban')
    }
    const normalized = value.trim().replace(/\s/g, '').toUpperCase()
    return new IBAN(normalized)
  }

  /**
   * Intenta crear un IBAN, retorna null si es inválido
   */
  public static createOrNull(value: string | null | undefined): IBAN | null {
    if (!value) return null
    try {
      return IBAN.create(value)
    } catch {
      return null
    }
  }

  /**
   * Valida los dígitos de control del IBAN usando el algoritmo MOD-97
   */
  private static validarDigitosControl(iban: string): boolean {
    // Mover los primeros 4 caracteres al final
    const reordenado = iban.substring(4) + iban.substring(0, 4)

    // Convertir letras a números (A=10, B=11, ..., Z=35)
    const numerico = reordenado
      .split('')
      .map(char => {
        const code = char.charCodeAt(0)
        if (code >= 65 && code <= 90) {
          // A-Z
          return (code - 55).toString()
        }
        return char
      })
      .join('')

    // Calcular MOD-97
    // Para números muy grandes, hacemos el cálculo en bloques
    let resto = 0
    for (let i = 0; i < numerico.length; i++) {
      resto = (resto * 10 + parseInt(numerico[i], 10)) % 97
    }

    return resto === 1
  }

  /**
   * Obtiene el valor del IBAN
   */
  public get valor(): string {
    return this.value
  }

  /**
   * Obtiene el código del país (primeros 2 caracteres)
   */
  public getCodigoPais(): string {
    return this.value.substring(0, 2)
  }

  /**
   * Obtiene los dígitos de control (caracteres 3 y 4)
   */
  public getDigitosControl(): string {
    return this.value.substring(2, 4)
  }

  /**
   * Obtiene el código de cuenta (resto del IBAN)
   */
  public getCodigoCuenta(): string {
    return this.value.substring(4)
  }

  /**
   * Verifica si es un IBAN español
   */
  public isEspañol(): boolean {
    return this.value.startsWith('ES')
  }

  /**
   * Formatea el IBAN con espacios cada 4 caracteres
   * Ejemplo: ES91 2100 0418 4502 0005 1332
   */
  public format(): string {
    return this.value.match(/.{1,4}/g)?.join(' ') || this.value
  }

  /**
   * Enmascara el IBAN para privacidad (GDPR)
   * Ejemplo: ES91 2100 0418 4502 0005 1332 -> ES91 **** **** **** **** 1332
   */
  public mask(): string {
    if (this.value.length < 8) {
      return this.value
    }
    const inicio = this.value.substring(0, 4)
    const fin = this.value.substring(this.value.length - 4)
    const medio = '*'.repeat(this.value.length - 8)
    return `${inicio} ${medio.match(/.{1,4}/g)?.join(' ')} ${fin}`
  }

  /**
   * Compara dos IBANs
   */
  public equals(otro: IBAN): boolean {
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
