import { describe, it, expect } from 'vitest'
import { calcularMetricas, diaMadrid, type FacturaMetrica, type OrdenMetrica } from './metricas'

const AHORA = new Date('2026-11-09T10:00:00Z')

const orden = (estado: string, fecha_entrada = '2026-10-01T09:00:00Z'): OrdenMetrica => ({ estado, fecha_entrada })
const factura = (estado: string, fecha_emision: string, base: number, iva = base * 0.21): FacturaMetrica => ({
  estado, fecha_emision, base_imponible: base, iva, total: base + iva,
})

describe('órdenes', () => {
  it('cuenta con los estados reales (antes «en reparación» y «completadas» salían siempre 0)', () => {
    const m = calcularMetricas(
      ['recibido', 'en_diagnostico', 'presupuestado', 'aprobado', 'en_progreso', 'en_progreso', 'finalizado', 'facturado', 'cancelado'].map((e) => orden(e)),
      [], AHORA
    )
    expect(m).toMatchObject({ pendientes: 4, enProgreso: 2, completadas: 2 })
    expect(m.porEstado).toMatchObject({ en_progreso: 2, cancelado: 1 })
  })

  it('órdenes de hoy en hora de Madrid', () => {
    // 23:30 UTC del día 8 ya es día 9 en Madrid
    const m = calcularMetricas([orden('recibido', '2026-11-08T23:30:00Z'), orden('recibido', '2026-11-08T22:30:00Z')], [], AHORA)
    expect(m.ordenesHoy).toBe(1)
    expect(diaMadrid('2026-11-08T23:30:00Z')).toBe('2026-11-09')
  })
})

describe('facturación', () => {
  const facturas = [
    factura('pagada', '2026-11-02', 100),
    factura('emitida', '2026-11-05', 200),
    factura('borrador', '2026-11-06', 1000),
    factura('anulada', '2026-11-07', 500),
    factura('pagada', '2026-10-15', 50),
    factura('vencida', '2026-07-10', 10),
  ]
  const m = calcularMetricas([], facturas, AHORA)

  it('el mes solo suma emitidas: ni borradores ni anuladas', () => {
    expect(m).toMatchObject({ baseImponibleMes: 300, ivaRecaudadoMes: 63, facturadoMes: 363, facturasMes: 2, facturadoMesAnterior: 60.5 })
  })

  it('seis meses de evolución, terminando en el actual', () => {
    expect(m.mensual.map((x) => x.mes)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
    expect(m.mensual.map((x) => x.etiqueta)).toEqual(['jun', 'jul', 'ago', 'sep', 'oct', 'nov'])
    expect(m.mensual[5].total).toBe(363)
    expect(m.mensual[1].total).toBe(12.1)
  })

  it('trimestre a presentar (4T) con su plazo', () => {
    expect(m.trimestre).toMatchObject({ clave: '2026-T4', base: 350, iva: 73.5, facturas: 3, plazoHasta: '2027-02-01', plazoAbierto: false, diasHastaFinPlazo: 84 })
  })

  it('pendiente de cobro: emitidas, enviadas y vencidas', () => {
    expect(m).toMatchObject({ pendienteCobro: 254.1, facturasSinCobrar: 2 })
  })
})
