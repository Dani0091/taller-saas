/**
 * @fileoverview Totales y versión del presupuesto de una orden
 * @description Un único cálculo para la página pública, la aceptación y el
 * envío (A10). La versión es un SHA-256 de lo que determina el importe: las
 * líneas (tipo, descripción, cantidad, precio) y el % de IVA de la orden.
 * Si cambia cualquiera, cambia la versión y la aceptación se rechaza (409).
 */

import { createHash } from 'node:crypto'

export interface LineaPresupuesto {
  id: string
  tipo: string
  descripcion: string | null
  cantidad: number
  precio_unitario: number
}

export interface TotalesPresupuesto {
  manoObra: number
  piezas: number
  subtotal: number
  iva: number
  total: number
}

/** Totales en vivo desde las líneas. Los suplidos nunca llevan IVA. */
export function calcularTotalesPresupuesto(lineas: LineaPresupuesto[], ivaPorcentajeOrden: number): TotalesPresupuesto {
  return lineas.reduce(
    (acc, l) => {
      const subtotalLinea = l.cantidad * l.precio_unitario
      const ivaPorcentajeLinea = l.tipo === 'suplido' ? 0 : ivaPorcentajeOrden
      const ivaLinea = subtotalLinea * (ivaPorcentajeLinea / 100)
      return {
        manoObra: l.tipo === 'mano_obra' ? acc.manoObra + subtotalLinea : acc.manoObra,
        piezas: l.tipo === 'pieza' ? acc.piezas + subtotalLinea : acc.piezas,
        subtotal: acc.subtotal + subtotalLinea,
        iva: acc.iva + ivaLinea,
        total: acc.total + subtotalLinea + ivaLinea,
      }
    },
    { manoObra: 0, piezas: 0, subtotal: 0, iva: 0, total: 0 }
  )
}

/** Huella estable: no depende del orden de llegada de las líneas ni de 50 vs 50.00. */
export function versionPresupuesto(lineas: LineaPresupuesto[], ivaPorcentajeOrden: number): string {
  const canonica = [...lineas]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((l) => [l.id, l.tipo, l.descripcion ?? '', Number(l.cantidad), Number(l.precio_unitario)])
  return createHash('sha256').update(JSON.stringify({ iva: Number(ivaPorcentajeOrden), lineas: canonica })).digest('hex')
}

/** Céntimos, como NUMERIC(10,2). */
export const redondearImporte = (n: number) => Math.round(n * 100) / 100

/** El % de IVA de la ORDEN (toggle "Aplicar IVA") manda; si no tiene, el del taller; si no, 21. */
export function ivaDeOrden(ivaOrden: number | null | undefined, ivaTaller: number | null | undefined): number {
  return ivaOrden ?? ivaTaller ?? 21
}
