/**
 * @fileoverview Value Object: Kilometraje
 * @description Representa el kilometraje de un vehículo
 *
 * REGLAS DE NEGOCIO:
 * - No puede ser negativo
 * - Debe ser un entero (no decimales)
 * - Máximo: 9,999,999 km (razonable para un vehículo)
 *
 * VENTAJA: Si mañana decides implementar alertas de kilometraje
 * sospechoso (ej. retroceso), solo modificas ESTE archivo
 */

import { ValidationError } from '@/domain/errors'

export class Kilometraje {
  private readonly value: number

  private constructor(value: number) {
    this.value = Math.floor(value) // Asegurar que sea entero
  }

  /**
   * Crea un kilometraje validando las reglas de negocio
   */
  public static create(value: number): Kilometraje {
    if (value < 0) {
      throw new ValidationError('El kilometraje no puede ser negativo', 'kilometraje')
    }

    if (!Number.isFinite(value)) {
      throw new ValidationError('El kilometraje debe ser un número válido', 'kilometraje')
    }

    // Límite razonable: 10 millones de kilómetros
    if (value > 9_999_999) {
      throw new ValidationError(
        'El kilometraje excede el límite razonable (9,999,999 km)',
        'kilometraje'
      )
    }

    return new Kilometraje(value)
  }

  /**
   * Crea desde un string (ej. "123456")
   */
  public static fromString(value: string): Kilometraje {
    // Eliminar separadores de miles si existen
    const cleaned = value.replace(/[.,\s]/g, '')
    const parsed = parseInt(cleaned, 10)

    if (isNaN(parsed)) {
      throw new ValidationError('Formato de kilometraje inválido', 'kilometraje')
    }

    return Kilometraje.create(parsed)
  }

  /**
   * Crea kilometraje en 0 (vehículo nuevo)
   */
  public static zero(): Kilometraje {
    return new Kilometraje(0)
  }

  /**
   * Obtiene el valor numérico
   */
  public get valor(): number {
    return this.value
  }

  /**
   * Formatea el kilometraje con separadores de miles
   */
  public format(): string {
    return new Intl.NumberFormat('es-ES').format(this.value) + ' km'
  }

  /**
   * Formatea sin unidad
   */
  public formatSinUnidad(): string {
    return new Intl.NumberFormat('es-ES').format(this.value)
  }

  /**
   * Calcula la diferencia con otro kilometraje
   * Útil para calcular km recorridos entre revisiones
   */
  public diferencia(anterior: Kilometraje): number {
    return this.value - anterior.value
  }

  /**
   * Verifica si el kilometraje ha retrocedido (posible fraude)
   */
  public haRetrocedido(anterior: Kilometraje): boolean {
    return this.value < anterior.value
  }

  /**
   * Estima si el vehículo tiene alto kilometraje
   * (> 150,000 km se considera alto)
   */
  public isAltoKilometraje(): boolean {
    return this.value > 150_000
  }

  /**
   * Compara dos kilometrajes
   */
  public equals(otro: Kilometraje): boolean {
    return this.value === otro.value
  }

  /**
   * Verifica si es mayor que otro kilometraje
   */
  public isGreaterThan(otro: Kilometraje): boolean {
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
