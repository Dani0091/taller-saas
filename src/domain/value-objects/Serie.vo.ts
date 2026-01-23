/**
 * @fileoverview Value Object: Serie de Facturación
 * @description Representa una serie de facturación (F, P, R, etc.)
 *
 * REGLAS DE NEGOCIO:
 * - Series predefinidas: F (Facturas), P (Presupuestos), R (Rectificativas)
 * - Máximo 3 caracteres
 * - Solo letras mayúsculas
 *
 * VENTAJA: Si mañana añades nuevas series, solo modificas ESTE archivo
 */

import { ValidationError } from '@/domain/errors'

export enum TipoSerie {
  FACTURA = 'F',
  PRESUPUESTO = 'P',
  RECTIFICATIVA = 'R',
  ABONO = 'A',
  PROFORMA = 'PRO'
}

export class Serie {
  private readonly value: string

  private constructor(value: string) {
    this.value = value.toUpperCase().trim()
  }

  /**
   * Crea una serie validando el formato
   */
  public static create(value: string): Serie {
    if (!value || !value.trim()) {
      throw new ValidationError('La serie no puede estar vacía', 'serie')
    }

    const normalized = value.toUpperCase().trim()

    // Validar longitud
    if (normalized.length > 3) {
      throw new ValidationError('La serie no puede tener más de 3 caracteres', 'serie')
    }

    // Validar solo letras
    if (!/^[A-Z]+$/.test(normalized)) {
      throw new ValidationError('La serie solo puede contener letras', 'serie')
    }

    return new Serie(normalized)
  }

  /**
   * Crea una serie desde el tipo predefinido
   */
  public static fromTipo(tipo: TipoSerie): Serie {
    return new Serie(tipo)
  }

  /**
   * Crea la serie por defecto de facturas
   */
  public static factura(): Serie {
    return Serie.fromTipo(TipoSerie.FACTURA)
  }

  /**
   * Crea la serie por defecto de presupuestos
   */
  public static presupuesto(): Serie {
    return Serie.fromTipo(TipoSerie.PRESUPUESTO)
  }

  /**
   * Obtiene el valor de la serie
   */
  public get valor(): string {
    return this.value
  }

  /**
   * Verifica si es la serie de facturas
   */
  public isFactura(): boolean {
    return this.value === TipoSerie.FACTURA
  }

  /**
   * Verifica si es la serie de presupuestos
   */
  public isPresupuesto(): boolean {
    return this.value === TipoSerie.PRESUPUESTO
  }

  /**
   * Verifica si es la serie de rectificativas
   */
  public isRectificativa(): boolean {
    return this.value === TipoSerie.RECTIFICATIVA
  }

  /**
   * Obtiene una descripción legible de la serie
   */
  public getDescripcion(): string {
    const descripciones: Record<string, string> = {
      [TipoSerie.FACTURA]: 'Factura',
      [TipoSerie.PRESUPUESTO]: 'Presupuesto',
      [TipoSerie.RECTIFICATIVA]: 'Factura Rectificativa',
      [TipoSerie.ABONO]: 'Factura de Abono',
      [TipoSerie.PROFORMA]: 'Factura Proforma'
    }

    return descripciones[this.value] || `Serie ${this.value}`
  }

  /**
   * Compara dos series
   */
  public equals(otra: Serie): boolean {
    return this.value === otra.value
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
