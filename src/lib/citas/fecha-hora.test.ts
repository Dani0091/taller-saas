import { describe, it, expect } from 'vitest'
import { horaLocalAInstante, instanteAHoraLocal } from './fecha-hora'

// Se ejecuta también con TZ=Europe/Madrid en la verificación (ver script de tests).
const offsetMin = (iso: string) => new Date(iso).getTimezoneOffset()

describe('horaLocalAInstante', () => {
  it('convierte la hora local al instante correcto (sea cual sea la zona)', () => {
    const local = '2026-11-08T09:00'
    const esperado = new Date(Date.UTC(2026, 10, 8, 9, 0) + offsetMin('2026-11-08T09:00') * 60_000).toISOString()
    expect(horaLocalAInstante(local)).toBe(esperado)
  })

  it('ida y vuelta: la hora que se ve es la que se eligió (invierno y verano)', () => {
    for (const local of ['2026-11-08T09:00', '2026-07-15T18:30', '2026-03-29T12:00']) {
      expect(instanteAHoraLocal(horaLocalAInstante(local))).toBe(local)
    }
  })

  it.each([null, undefined, '', 'no es fecha'])('%s → null', (v) => {
    expect(horaLocalAInstante(v)).toBeNull()
  })
})

describe('instanteAHoraLocal', () => {
  it.each([null, undefined, '', 'x'])('%s → cadena vacía', (v) => {
    expect(instanteAHoraLocal(v)).toBe('')
  })
})
