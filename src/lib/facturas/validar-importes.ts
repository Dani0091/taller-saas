/**
 * @fileoverview Validación de importes de cabecera de factura
 * @description Las rectificativas no se crean por api/facturas/crear, así
 * que ahí un importe negativo, no numérico o infinito es siempre un error.
 */

/** Límite de cordura: ninguna factura de taller llega a mil millones. */
const IMPORTE_MAXIMO = 1e9

export function validarImportesFactura(importes: Record<string, unknown>, campos: readonly string[]): string | null {
  for (const campo of campos) {
    const valor = importes[campo]
    if (valor === undefined || valor === null) continue
    if (typeof valor !== 'number' || !Number.isFinite(valor)) return `${campo} debe ser un número`
    if (valor < 0) return `${campo} no puede ser negativo`
    if (valor > IMPORTE_MAXIMO) return `${campo} fuera de rango`
  }
  return null
}
