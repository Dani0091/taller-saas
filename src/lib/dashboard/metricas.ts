/**
 * @fileoverview Cálculo de las métricas del inicio
 * @description Función pura (sin Supabase) para poder probarla. Fechas en
 * hora de Madrid. Solo cuentan como facturado las facturas emitidas
 * (emitida, enviada, pagada, vencida): ni borradores ni anuladas.
 */

import { trimestreAPresentar, rangoTrimestre, etiquetaTrimestre, claveTrimestre, diasEntre } from '@/lib/facturas/trimestres'
import { redondearImporte } from '@/lib/ordenes/version-presupuesto'

export interface OrdenMetrica { estado: string | null; fecha_entrada: string | null }
export interface FacturaMetrica {
  estado: string | null
  fecha_emision: string | null
  total: number | string | null
  base_imponible: number | string | null
  iva: number | string | null
}

export const ESTADOS_EMITIDA = ['emitida', 'enviada', 'pagada', 'vencida']
const ESTADOS_SIN_COBRAR = ['emitida', 'enviada', 'vencida']
// Estados reales de ordenes_reparacion (antes se buscaban otros que no existen)
const PENDIENTES = ['recibido', 'en_diagnostico', 'presupuestado', 'aprobado']
const EN_PROGRESO = ['en_progreso']
const TERMINADAS = ['finalizado', 'facturado']

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** 'AAAA-MM-DD' de un instante en Europe/Madrid. */
export function diaMadrid(instante: Date | string): string {
  const fecha = typeof instante === 'string' ? new Date(instante) : instante
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha)
}

const num = (v: number | string | null) => Number(v) || 0

function sumar(facturas: FacturaMetrica[]) {
  const s = facturas.reduce(
    (acc, f) => ({ base: acc.base + num(f.base_imponible), iva: acc.iva + num(f.iva), total: acc.total + num(f.total) }),
    { base: 0, iva: 0, total: 0 }
  )
  return { base: redondearImporte(s.base), iva: redondearImporte(s.iva), total: redondearImporte(s.total) }
}

/** Mes 'AAAA-MM' desplazado n meses. */
function mesDesplazado(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function calcularMetricas(ordenes: OrdenMetrica[], facturas: FacturaMetrica[], ahora: Date = new Date()) {
  const hoy = diaMadrid(ahora)
  const mesActual = hoy.slice(0, 7)

  const porEstado: Record<string, number> = {}
  for (const o of ordenes) {
    const e = o.estado || 'recibido'
    porEstado[e] = (porEstado[e] || 0) + 1
  }
  const contar = (estados: string[]) => estados.reduce((n, e) => n + (porEstado[e] || 0), 0)

  const emitidas = facturas.filter((f) => f.fecha_emision && ESTADOS_EMITIDA.includes(f.estado || ''))
  const delMes = (mes: string) => emitidas.filter((f) => f.fecha_emision!.slice(0, 7) === mes)

  const mesAnterior = mesDesplazado(mesActual, -1)
  const mensual = Array.from({ length: 6 }, (_, i) => {
    const mes = mesDesplazado(mesActual, i - 5)
    return { mes, etiqueta: MESES[Number(mes.slice(5)) - 1], ...sumar(delMes(mes)) }
  })

  const aPresentar = trimestreAPresentar(hoy)
  const { desde, hasta } = rangoTrimestre(aPresentar.trimestre)
  const delTrimestre = emitidas.filter((f) => f.fecha_emision! >= desde && f.fecha_emision! <= hasta)
  const sinCobrar = emitidas.filter((f) => ESTADOS_SIN_COBRAR.includes(f.estado || ''))

  const mes = sumar(delMes(mesActual))
  return {
    ordenesHoy: ordenes.filter((o) => o.fecha_entrada && diaMadrid(o.fecha_entrada) === hoy).length,
    pendientes: contar(PENDIENTES),
    enProgreso: contar(EN_PROGRESO),
    completadas: contar(TERMINADAS),
    porEstado,
    facturadoMes: mes.total,
    baseImponibleMes: mes.base,
    ivaRecaudadoMes: mes.iva,
    facturasMes: delMes(mesActual).length,
    facturadoMesAnterior: sumar(delMes(mesAnterior)).total,
    mensual,
    trimestre: {
      clave: claveTrimestre(aPresentar.trimestre),
      etiqueta: etiquetaTrimestre(aPresentar.trimestre),
      ...sumar(delTrimestre),
      facturas: delTrimestre.length,
      plazoDesde: aPresentar.plazo.desde,
      plazoHasta: aPresentar.plazo.hasta,
      plazoAbierto: aPresentar.abierto,
      diasHastaFinPlazo: diasEntre(hoy, aPresentar.plazo.hasta),
    },
    pendienteCobro: sumar(sinCobrar).total,
    facturasSinCobrar: sinCobrar.length,
  }
}

export type MetricasCalculadas = ReturnType<typeof calcularMetricas>
