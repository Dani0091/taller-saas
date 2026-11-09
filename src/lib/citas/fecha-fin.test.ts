import { describe, it, expect } from 'vitest'
import { fechaFinEfectiva, fechaFinParaGuardar, finAnteriorAInicio } from './fecha-fin'

const INICIO = '2026-11-15T10:00:00.000Z'

describe('fechaFinEfectiva (lectura)', () => {
  it('respeta un fin posterior al inicio', () => {
    const fin = new Date('2026-11-15T12:00:00Z')
    expect(fechaFinEfectiva(new Date(INICIO), fin, false)).toBe(fin)
  })
  it('sin fin y con horario → inicio + 1 h', () => {
    expect(fechaFinEfectiva(new Date(INICIO), undefined, false)?.toISOString()).toBe('2026-11-15T11:00:00.000Z')
  })
  it('fin igual o anterior al inicio → inicio + 1 h (no tumba el calendario)', () => {
    expect(fechaFinEfectiva(new Date(INICIO), new Date(INICIO), false)?.toISOString()).toBe('2026-11-15T11:00:00.000Z')
    expect(fechaFinEfectiva(new Date(INICIO), new Date('2026-11-15T09:00:00Z'), false)?.toISOString()).toBe('2026-11-15T11:00:00.000Z')
  })
  it('todo el día: el fin no se toca', () => {
    expect(fechaFinEfectiva(new Date(INICIO), undefined, true)).toBeUndefined()
  })
  it('inicio inválido → devuelve el fin tal cual (no inventa fechas)', () => {
    expect(fechaFinEfectiva(new Date('x'), undefined, false)).toBeUndefined()
  })
})

describe('fechaFinParaGuardar (escritura)', () => {
  it('fin enviado → se guarda tal cual', () => {
    expect(fechaFinParaGuardar(INICIO, '2026-11-15T12:00', false)).toBe('2026-11-15T12:00')
  })
  it('hora del formulario sin zona: +1 h sin cambiar de zona', () => {
    expect(fechaFinParaGuardar('2026-11-08T09:00', null, false)).toBe('2026-11-08T10:00:00')
    expect(fechaFinParaGuardar('2026-11-08T23:30', '', false)).toBe('2026-11-09T00:30:00')
  })
  it('hora con zona: +1 h en ISO', () => {
    expect(fechaFinParaGuardar(INICIO, null, undefined)).toBe('2026-11-15T11:00:00.000Z')
  })
  it('todo el día → null', () => {
    expect(fechaFinParaGuardar(INICIO, '', true)).toBeNull()
  })
  it.each([undefined, null, 42, 'no es fecha', '2026-13-45T99:99'])('inicio inválido (%s) → null', (inicio) => {
    expect(fechaFinParaGuardar(inicio, '', false)).toBeNull()
  })
})

describe('finAnteriorAInicio', () => {
  it('fin el día anterior → true (caso de la captura: 09/11 10:00 → 08/11 12:30)', () => {
    expect(finAnteriorAInicio('2026-11-09T09:00:00.000Z', '2026-11-08T11:30:00.000Z')).toBe(true)
  })

  it('fin posterior o igual → false', () => {
    expect(finAnteriorAInicio(INICIO, '2026-11-15T11:00:00.000Z')).toBe(false)
    expect(finAnteriorAInicio(INICIO, INICIO)).toBe(false)
  })

  it.each([[INICIO, null], [INICIO, ''], [null, INICIO], [INICIO, 'no-es-fecha']])('sin fin o inválido (%s, %s) → false', (i, f) => {
    expect(finAnteriorAInicio(i, f)).toBe(false)
  })
})
