/**
 * @fileoverview Value Object: Retención (IRPF)
 * @description Representa una retención de IRPF sobre servicios profesionales
 *
 * REGLAS DE NEGOCIO:
 * - Retenciones comunes en España: 7%, 15%, 19%, 21%
 * - Se aplica sobre la base imponible (sin IVA)
 * - Reduce el total a pagar de la factura
 *
 * VENTAJA: Si mañana cambian los porcentajes de retención,
 * solo modificas ESTE archivo
 */

import { ValidationError } from '@/domain/errors'
import { Precio } from './Precio.vo'

export class Retencion {
  private readonly porcentaje: number

  private constructor(porcentaje: number) {
    this.porcentaje = porcentaje
  }

  /**
   * Crea una retención validando el porcentaje
   */
  public static create(porcentaje: number): Retencion {
    if (porcentaje < 0 || porcentaje > 100) {
      throw new ValidationError(
        'El porcentaje de retención debe estar entre 0 y 100',
        'retencion'
      )
    }

    return new Retencion(porcentaje)
  }

  /**
   * Retenciones predefinidas comunes en España
   */
  public static ninguna(): Retencion {
    return new Retencion(0)
  }

  public static profesional(): Retencion {
    return new Retencion(15) // 15% para profesionales
  }

  public static reducida(): Retencion {
    return new Retencion(7) // 7% para inicio de actividad (3 primeros años)
  }

  public static aumentada(): Retencion {
    return new Retencion(19) // 19% en algunos casos
  }

  /**
   * Obtiene el porcentaje
   */
  public getPorcentaje(): number {
    return this.porcentaje
  }

  /**
   * Calcula el importe de retención sobre una base
   */
  public calcularImporte(base: Precio): Precio {
    return base.calcularIVA(this.porcentaje)
  }

  /**
   * Verifica si hay retención
   */
  public hayRetencion(): boolean {
    return this.porcentaje > 0
  }

  /**
   * Formatea el porcentaje
   */
  public format(): string {
    return `${this.porcentaje}%`
  }

  /**
   * Compara dos retenciones
   */
  public equals(otra: Retencion): boolean {
    return this.porcentaje === otra.porcentaje
  }

  /**
   * Serializa a número (para guardar en BD)
   */
  public toNumber(): number {
    return this.porcentaje
  }

  /**
   * Serializa a JSON
   */
  public toJSON(): number {
    return this.porcentaje
  }
}
