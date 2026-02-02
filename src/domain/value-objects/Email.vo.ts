/**
 * @fileoverview Value Object: Email
 * @description Representa un email con validación estricta
 *
 * REGLAS DE NEGOCIO:
 * - Formato válido según RFC 5322 (simplificado)
 * - Normalizado a minúsculas
 * - Sin espacios en blanco
 *
 * VENTAJA: Si mañana decides integrar con un servicio de validación
 * de emails avanzado, solo cambias ESTE archivo
 */

import { ValidationError } from '@/domain/errors'

export class Email {
  private readonly value: string

  private constructor(value: string) {
    this.value = value.toLowerCase().trim()
  }

  /**
   * Crea un email validando el formato
   */
  public static create(value: string): Email {
    if (!value || !value.trim()) {
      throw new ValidationError('El email no puede estar vacío', 'email')
    }

    const normalized = value.toLowerCase().trim()

    // Validación de formato básico (RFC 5322 simplificado)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalized)) {
      throw new ValidationError('Formato de email inválido', 'email')
    }

    // Validaciones adicionales
    if (normalized.length > 254) {
      throw new ValidationError('El email es demasiado largo', 'email')
    }

    const [localPart, domain] = normalized.split('@')

    if (localPart.length > 64) {
      throw new ValidationError('La parte local del email es demasiado larga', 'email')
    }

    if (domain.length > 253) {
      throw new ValidationError('El dominio del email es demasiado largo', 'email')
    }

    // Validar caracteres no permitidos
    if (/[<>()[\]\\,;:\s"]/.test(normalized)) {
      throw new ValidationError('El email contiene caracteres no permitidos', 'email')
    }

    return new Email(normalized)
  }

  /**
   * Obtiene el valor del email
   */
  public get valor(): string {
    return this.value
  }

  /**
   * Obtiene el dominio del email
   */
  public getDominio(): string {
    return this.value.split('@')[1]
  }

  /**
   * Obtiene la parte local del email (antes del @)
   */
  public getLocalPart(): string {
    return this.value.split('@')[0]
  }

  /**
   * Verifica si el email pertenece a un dominio específico
   */
  public isDominio(dominio: string): boolean {
    return this.getDominio() === dominio.toLowerCase()
  }

  /**
   * Enmascara el email para mostrar parcialmente
   * Ejemplo: john.doe@example.com → j***e@example.com
   */
  public mask(): string {
    const [local, domain] = this.value.split('@')
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`
    }
    return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`
  }

  /**
   * Compara dos emails
   */
  public equals(otro: Email): boolean {
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
