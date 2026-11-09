import { describe, it, expect } from 'vitest'
import { porcentajeIva, porcentajeIvaCabecera } from './iva'

describe('porcentajeIva', () => {
  it('0 % es un valor válido (antes se convertía en 21 %)', () => {
    expect(porcentajeIva(0)).toBe(0)
    expect(porcentajeIva('0')).toBe(0)
    expect(porcentajeIva('0.00')).toBe(0)
  })

  it('los tipos habituales se respetan', () => {
    expect(porcentajeIva(21)).toBe(21)
    expect(porcentajeIva('10')).toBe(10)
    expect(porcentajeIva('4')).toBe(4)
    expect(porcentajeIva('10,5')).toBe(10.5)
  })

  it.each([undefined, null, '', 'abc', NaN, -1, 101, Infinity])('vacío o inválido (%s) → defecto', (v) => {
    expect(porcentajeIva(v)).toBe(21)
    expect(porcentajeIva(v, 10)).toBe(10)
  })

  it('un defecto de 0 (taller exento) también se respeta', () => {
    expect(porcentajeIva(undefined, 0)).toBe(0)
  })
})

describe('porcentajeIvaCabecera', () => {
  it('todas las líneas al mismo % → ese %', () => {
    expect(porcentajeIvaCabecera([0, 0], 21)).toBe(0)
    expect(porcentajeIvaCabecera([21, 21, 21], 21)).toBe(21)
    expect(porcentajeIvaCabecera([10], 21)).toBe(10)
  })

  it('mezcla de % o sin líneas → el del taller (como hasta ahora)', () => {
    expect(porcentajeIvaCabecera([21, 0], 21)).toBe(21)
    expect(porcentajeIvaCabecera([], 21)).toBe(21)
  })
})
