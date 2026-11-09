/**
 * @fileoverview Libro de facturas emitidas en CSV (para la gestoría / 303)
 * @description Formato que abre Excel en español sin preguntar: separador
 * «;», coma decimal sin separador de miles, fechas dd/mm/aaaa, BOM UTF-8 y
 * saltos de línea CRLF. Las anuladas aparecen marcadas y no suman.
 */

import { redondearImporte } from '@/lib/ordenes/version-presupuesto'

export interface FacturaLibro {
  numero_factura: string | null
  fecha_emision: string
  estado: string
  es_simplificada?: boolean | null
  cliente_nombre?: string | null
  cliente_nif?: string | null
  base_imponible: number | string | null
  iva_porcentaje: number | string | null
  iva: number | string | null
  total: number | string | null
}

const ESTADOS: Record<string, string> = {
  emitida: 'Emitida', enviada: 'Enviada', pagada: 'Pagada', vencida: 'Vencida', anulada: 'Anulada',
}

const num = (v: number | string | null | undefined) => Number(v) || 0
/** 1234.5 → «1234,50» (sin miles: Excel lo lee como número) */
export const importeCsv = (v: number | string | null | undefined) => num(v).toFixed(2).replace('.', ',')
const fechaCsv = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** Entre comillas si lleva «;», comillas o saltos de línea. Evita fórmulas (=, +, -, @). */
export function celdaCsv(valor: string | number | null | undefined): string {
  let s = valor == null ? '' : String(valor)
  if (/^[=+\-@]/.test(s) && Number.isNaN(Number(s.replace(',', '.')))) s = `'${s}`
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const CABECERA_LIBRO = [
  'Número', 'Fecha expedición', 'Tipo', 'Estado', 'Cliente', 'NIF cliente',
  'Base imponible', 'Tipo IVA (%)', 'Cuota IVA', 'Total',
]

export function libroFacturasCsv(facturas: FacturaLibro[], titulo: string): string {
  const filas: (string | number | null | undefined)[][] = [[titulo], CABECERA_LIBRO]
  const suma = { base: 0, iva: 0, total: 0, n: 0 }

  for (const f of facturas) {
    const anulada = f.estado === 'anulada'
    filas.push([
      f.numero_factura,
      fechaCsv(f.fecha_emision),
      f.es_simplificada ? 'Simplificada' : num(f.total) < 0 ? 'Rectificativa' : 'Completa',
      ESTADOS[f.estado] ?? f.estado,
      f.cliente_nombre,
      f.cliente_nif,
      importeCsv(f.base_imponible),
      importeCsv(f.iva_porcentaje),
      importeCsv(f.iva),
      importeCsv(f.total),
    ])
    if (!anulada) {
      suma.base += num(f.base_imponible)
      suma.iva += num(f.iva)
      suma.total += num(f.total)
      suma.n += 1
    }
  }

  filas.push([])
  filas.push([`Totales (${suma.n} facturas, sin anuladas)`, '', '', '', '', '',
    importeCsv(redondearImporte(suma.base)), '', importeCsv(redondearImporte(suma.iva)), importeCsv(redondearImporte(suma.total))])

  return '﻿' + filas.map((f) => f.map(celdaCsv).join(';')).join('\r\n') + '\r\n'
}
