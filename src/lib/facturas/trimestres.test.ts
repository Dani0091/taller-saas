import { describe, it, expect } from 'vitest'
import {
  trimestreDe, rangoTrimestre, plazoPresentacion, claveTrimestre, trimestreDeClave,
  etiquetaTrimestre, trimestresRecientes, trimestreAPresentar, diasEntre,
} from './trimestres'

describe('trimestres naturales', () => {
  it('cada mes cae en su trimestre', () => {
    expect(['2026-01-01', '2026-03-31', '2026-04-01', '2026-06-30', '2026-07-15', '2026-09-30', '2026-10-01', '2026-12-31']
      .map((f) => trimestreDe(f).t)).toEqual([1, 1, 2, 2, 3, 3, 4, 4])
    expect(trimestreDe(new Date(2026, 10, 9))).toEqual({ año: 2026, t: 4 })
  })

  it('rango completo, incluido febrero bisiesto', () => {
    expect(rangoTrimestre({ año: 2026, t: 1 })).toEqual({ desde: '2026-01-01', hasta: '2026-03-31' })
    expect(rangoTrimestre({ año: 2026, t: 2 })).toEqual({ desde: '2026-04-01', hasta: '2026-06-30' })
    expect(rangoTrimestre({ año: 2026, t: 3 })).toEqual({ desde: '2026-07-01', hasta: '2026-09-30' })
    expect(rangoTrimestre({ año: 2026, t: 4 })).toEqual({ desde: '2026-10-01', hasta: '2026-12-31' })
  })

  it('clave y etiqueta', () => {
    expect(claveTrimestre({ año: 2026, t: 3 })).toBe('2026-T3')
    expect(trimestreDeClave('2026-T3')).toEqual({ año: 2026, t: 3 })
    expect(trimestreDeClave('2026-T5')).toBeNull()
    expect(etiquetaTrimestre({ año: 2026, t: 3 })).toBe('3T 2026 (jul–sep)')
  })

  it('recientes: actual y anteriores, cruzando de año', () => {
    expect(trimestresRecientes(new Date(2026, 1, 10), 3)).toEqual([{ año: 2026, t: 1 }, { año: 2025, t: 4 }, { año: 2025, t: 3 }])
  })
})

describe('plazo de presentación (303 / 130)', () => {
  it('1T, 2T y 3T hasta el 20; 4T hasta el 30 de enero', () => {
    expect(plazoPresentacion({ año: 2026, t: 1 })).toEqual({ desde: '2026-04-01', hasta: '2026-04-20' })
    expect(plazoPresentacion({ año: 2026, t: 2 })).toEqual({ desde: '2026-07-01', hasta: '2026-07-20' })
    expect(plazoPresentacion({ año: 2026, t: 3 })).toEqual({ desde: '2026-10-01', hasta: '2026-10-20' })
  })

  it('si el último día es fin de semana, pasa al lunes', () => {
    // 30/01/2027 es sábado → lunes 1/02/2027
    expect(plazoPresentacion({ año: 2026, t: 4 })).toEqual({ desde: '2027-01-01', hasta: '2027-02-01' })
    // 20/07/2025 fue domingo → lunes 21
    expect(plazoPresentacion({ año: 2025, t: 2 }).hasta).toBe('2025-07-21')
  })

  it('qué trimestre toca presentar hoy', () => {
    expect(trimestreAPresentar('2026-10-05')).toMatchObject({ trimestre: { año: 2026, t: 3 }, abierto: true })
    expect(trimestreAPresentar('2026-11-09')).toMatchObject({ trimestre: { año: 2026, t: 4 }, abierto: false, plazo: { hasta: '2027-02-01' } })
    expect(trimestreAPresentar('2027-01-15')).toMatchObject({ trimestre: { año: 2026, t: 4 }, abierto: true })
  })

  it('días entre fechas', () => {
    expect(diasEntre('2026-11-09', '2027-02-01')).toBe(84)
    expect(diasEntre('2026-03-28', '2026-03-30')).toBe(2)
  })
})
