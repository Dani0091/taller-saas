/**
 * @fileoverview Value Object: Teléfono
 * @description Representa un número de teléfono español
 *
 * REGLAS DE NEGOCIO:
 * - Formato español: móvil (6XX XXX XXX o 7XX XXX XXX) o fijo (9XX XXX XXX)
 * - Normalizado: sin espacios, sin guiones, solo dígitos
 * - Puede incluir prefijo internacional (+34)
 *
 * VENTAJA: Si mañana necesitas soportar teléfonos internacionales,
 * solo extiendes ESTE archivo
 */

import { ValidationError } from '@/domain/errors'

export class Telefono {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  /**
   * Crea un teléfono validando el formato español
   */
  public static create(value: string): Telefono {
    if (!value || !value.trim()) {
      throw new ValidationError('El teléfono no puede estar vacío', 'telefono')
    }

    // Normalizar: eliminar espacios, guiones, paréntesis
    let normalized = value.trim().replace(/[\s\-()]/g, '')

    // Eliminar prefijo +34 si existe
    if (normalized.startsWith('+34')) {
      normalized = normalized.slice(3)
    } else if (normalized.startsWith('0034')) {
      normalized = normalized.slice(4)
    } else if (normalized.startsWith('34')) {
      normalized = normalized.slice(2)
    }

    // Validar que solo contenga dígitos
    if (!/^\d+$/.test(normalized)) {
      throw new ValidationError('El teléfono solo puede contener números', 'telefono')
    }

    // Validar longitud (teléfonos españoles tienen 9 dígitos)
    if (normalized.length !== 9) {
      throw new ValidationError('El teléfono debe tener 9 dígitos', 'telefono')
    }

    // Validar formato español
    const primerDigito = normalized[0]
    if (!['6', '7', '8', '9'].includes(primerDigito)) {
      throw new ValidationError(
        'Formato de teléfono español no válido. Debe empezar por 6, 7, 8 o 9',
        'telefono'
      )
    }

    return new Telefono(normalized)
  }

  /**
   * Crea teléfono sin validación estricta (para datos legacy o internacionales)
   */
  public static createUnsafe(value: string): Telefono {
    if (!value || !value.trim()) {
      throw new ValidationError('El teléfono no puede estar vacío', 'telefono')
    }
    const normalized = value.trim().replace(/[\s\-()]/g, '')
    return new Telefono(normalized)
  }

  /**
   * Obtiene el valor del teléfono
   */
  public get valor(): string {
    return this.value
  }

  /**
   * Verifica si es un móvil (6XX o 7XX)
   */
  public isMovil(): boolean {
    return this.value[0] === '6' || this.value[0] === '7'
  }

  /**
   * Verifica si es un fijo (8XX o 9XX)
   */
  public isFijo(): boolean {
    return this.value[0] === '8' || this.value[0] === '9'
  }

  /**
   * Formatea el teléfono con espacios (XXX XXX XXX)
   */
  public format(): string {
    return `${this.value.slice(0, 3)} ${this.value.slice(3, 6)} ${this.value.slice(6)}`
  }

  /**
   * Formatea con prefijo internacional
   */
  public formatInternacional(): string {
    return `+34 ${this.format()}`
  }

  /**
   * Obtiene el teléfono en formato para enlace tel:
   */
  public toTelLink(): string {
    return `tel:+34${this.value}`
  }

  /**
   * Obtiene el teléfono en formato para WhatsApp
   */
  public toWhatsAppLink(mensaje?: string): string {
    const numero = `34${this.value}`
    if (mensaje) {
      return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
    }
    return `https://wa.me/${numero}`
  }

  /**
   * Compara dos teléfonos
   */
  public equals(otro: Telefono): boolean {
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
