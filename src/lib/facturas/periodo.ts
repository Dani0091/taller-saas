/**
 * @fileoverview Periodos del listado de facturas → rango de días
 * @description fecha_emision es DATE: el filtro va por días (AAAA-MM-DD),
 * calculados en la zona del navegador del taller, sin conversiones a UTC.
 */

import { format, startOfWeek, startOfMonth, startOfYear, subMonths } from 'date-fns'
import { trimestreDeClave, rangoTrimestre } from './trimestres'

/** Además de los fijos, un trimestre fiscal con su clave: '2026-T4' */
export type PeriodoFactura = 'todas' | 'hoy' | 'semana' | 'mes' | '3meses' | 'año' | 'personalizado' | `${number}-T${1 | 2 | 3 | 4}`

export const PERIODOS_FACTURA: { value: PeriodoFactura; label: string }[] = [
  { value: 'todas', label: 'Sin filtro' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: '3meses', label: 'Últimos 3 meses' },
  { value: 'año', label: 'Este año' },
  { value: 'personalizado', label: 'Fecha personalizada' },
]

const dia = (d: Date) => format(d, 'yyyy-MM-dd')
const DIA = /^\d{4}-\d{2}-\d{2}$/

/** Rango inclusivo [desde, hasta] en días; undefined = sin límite por ese lado. */
export function rangoPeriodo(
  periodo: PeriodoFactura,
  personalizado: { from: string; to: string } = { from: '', to: '' },
  hoy: Date = new Date()
): { fechaDesde?: string; fechaHasta?: string } {
  switch (periodo) {
    case 'hoy': return { fechaDesde: dia(hoy), fechaHasta: dia(hoy) }
    case 'semana': return { fechaDesde: dia(startOfWeek(hoy, { weekStartsOn: 1 })), fechaHasta: dia(hoy) }
    case 'mes': return { fechaDesde: dia(startOfMonth(hoy)), fechaHasta: dia(hoy) }
    case '3meses': return { fechaDesde: dia(subMonths(hoy, 3)), fechaHasta: dia(hoy) }
    case 'año': return { fechaDesde: dia(startOfYear(hoy)), fechaHasta: dia(hoy) }
    case 'personalizado': {
      let desde = DIA.test(personalizado.from) ? personalizado.from : undefined
      let hasta = DIA.test(personalizado.to) ? personalizado.to : undefined
      // Rango al revés: se interpreta como el mismo rango ordenado
      if (desde && hasta && desde > hasta) [desde, hasta] = [hasta, desde]
      return { fechaDesde: desde, fechaHasta: hasta }
    }
    default: {
      const trimestre = trimestreDeClave(periodo)
      if (!trimestre) return {}
      const { desde, hasta } = rangoTrimestre(trimestre)
      return { fechaDesde: desde, fechaHasta: hasta }
    }
  }
}
