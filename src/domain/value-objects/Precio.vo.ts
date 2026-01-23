/**
 * @fileoverview Value Object: Precio
 * @description Representa un precio monetario con validaciones y formato
 *
 * REGLAS DE NEGOCIO:
 * - No puede ser negativo
 * - Máximo 2 decimales
 * - Formato: EUR (€)
 *
 * VENTAJA: Si mañana cambias la moneda o las reglas de redondeo,
 * solo cambias ESTE archivo y se aplica en toda la app
 */

import { ValidationError } from '@/domain/errors'

export class Precio {
  private readonly value: number

  private constructor(value: number) {
    this.value = Number(value.toFixed(2))
  }

  /**
   * Crea un precio validando las reglas de negocio
   */
  public static create(value: number): Precio {
    if (value < 0) {
      throw new ValidationError('El precio no puede ser negativo', 'precio')
    }

    if (!Number.isFinite(value)) {
      throw new ValidationError('El precio debe ser un número válido', 'precio')
    }

    // Límite de seguridad: 1 millón de euros
    if (value > 1_000_000) {
      throw new ValidationError('El precio excede el límite permitido', 'precio')
    }

    return new Precio(value)
  }

  /**
   * Crea un precio desde un string (ej. "123.45")
   */
  public static fromString(value: string): Precio {
    const parsed = parseFloat(value.replace(',', '.'))
    if (isNaN(parsed)) {
      throw new ValidationError('Formato de precio inválido', 'precio')
    }
    return Precio.create(parsed)
  }

  /**
   * Crea un precio de 0 (útil para inicialización)
   */
  public static zero(): Precio {
    return new Precio(0)
  }

  /**
   * Obtiene el valor numérico
   */
  public get valor(): number {
    return this.value
  }

  /**
   * Formatea el precio como moneda EUR
   */
  public format(): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(this.value)
  }

  /**
   * Formatea sin símbolo de moneda
   */
  public formatSinSimbolo(): string {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(this.value)
  }

  /**
   * Suma dos precios (operación atómica)
   */
  public add(otro: Precio): Precio {
    return Precio.create(this.value + otro.value)
  }

  /**
   * Multiplica el precio por una cantidad
   */
  public multiply(cantidad: number): Precio {
    return Precio.create(this.value * cantidad)
  }

  /**
   * Calcula el IVA sobre este precio
   */
  public calcularIVA(porcentaje: number): Precio {
    if (porcentaje < 0 || porcentaje > 100) {
      throw new ValidationError('Porcentaje de IVA inválido', 'iva')
    }
    return Precio.create(this.value * (porcentaje / 100))
  }

  /**
   * Compara dos precios
   */
  public equals(otro: Precio): boolean {
    return this.value === otro.value
  }

  /**
   * Verifica si el precio es mayor que otro
   */
  public isGreaterThan(otro: Precio): boolean {
    return this.value > otro.value
  }

  /**
   * Serializa a número (para guardar en BD)
   */
  public toNumber(): number {
    return this.value
  }

  /**
   * Serializa a JSON
   */
  public toJSON(): number {
    return this.value
  }
}
