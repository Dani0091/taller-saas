import { describe, it, expect } from 'vitest'
import {
  formatearSecuencial,
  construirNumeroCompleto,
  interpretarRespuestaNumeracion,
} from './numeracion-formato'

// Simula LPAD(x, 3, '0') de PostgreSQL: trunca por la derecha si x tiene >3 dígitos.
const lpad3 = (n: number) => String(n).padStart(3, '0').slice(0, 3)

// Respuesta de la v3 instalada en producción (catálogo 2026-10-06): sin año.
const v3Prod = (prefijo: string, n: number) => ({ prefijo, numero: n, numero_completo: `${prefijo}-${lpad3(n)}` })
// Respuesta de la v3 del repo (migración 20260225) y de la propuesta v4: con año.
const conAño = (prefijo: string, año: number, n: number, sec = lpad3(n)) => ({
  prefijo, año, numero: n, numero_completo: `${prefijo}-${año}-${sec}`,
})

describe('formatearSecuencial', () => {
  it.each([
    [1, '001'], [8, '008'], [99, '099'], [100, '100'], [999, '999'],
    [1000, '1000'], [1001, '1001'], [10000, '10000'],
  ])('%i → %s', (n, esperado) => expect(formatearSecuencial(n)).toBe(esperado))
})

describe('construirNumeroCompleto', () => {
  it('sin año (formato de producción)', () => expect(construirNumeroCompleto('FA', 8)).toBe('FA-008'))
  it('con año (v3 repo / v4)', () => expect(construirNumeroCompleto('FA', 8, 2026)).toBe('FA-2026-008'))
})

describe('interpretarRespuestaNumeracion — v3 de producción', () => {
  it('por debajo de 1000 devuelve exactamente lo mismo que la RPC', () => {
    for (const n of [1, 8, 99, 100, 500, 999]) {
      const r = interpretarRespuestaNumeracion(v3Prod('FA', n))
      expect(r).toEqual({ valido: true, numeroCompleto: v3Prod('FA', n).numero_completo, numero: n, corregidoTruncado: false })
    }
  })

  it('1000: corrige el truncado (FA-100 → FA-1000)', () => {
    expect(v3Prod('FA', 1000).numero_completo).toBe('FA-100')
    expect(interpretarRespuestaNumeracion(v3Prod('FA', 1000))).toEqual({
      valido: true, numeroCompleto: 'FA-1000', numero: 1000, corregidoTruncado: true,
    })
  })

  it('regresión: 100 y 1000 nunca producen el mismo número', () => {
    const a = interpretarRespuestaNumeracion(v3Prod('FA', 100))
    const b = interpretarRespuestaNumeracion(v3Prod('FA', 1000))
    expect(a.valido && b.valido && a.numeroCompleto !== b.numeroCompleto).toBe(true)
  })

  it('secuencia 995..1005 sin duplicados y ordenable por número', () => {
    const nums = Array.from({ length: 11 }, (_, i) => 995 + i).map((n) => {
      const r = interpretarRespuestaNumeracion(v3Prod('FS', n))
      if (!r.valido) throw new Error(r.motivo)
      return r.numeroCompleto
    })
    expect(new Set(nums).size).toBe(11)
    expect(nums[4]).toBe('FS-999')
    expect(nums[5]).toBe('FS-1000')
  })
})

describe('interpretarRespuestaNumeracion — con año (v3 repo / v4)', () => {
  it('por debajo de 1000, idéntico', () => {
    expect(interpretarRespuestaNumeracion(conAño('RS', 2026, 8))).toMatchObject({ valido: true, numeroCompleto: 'RS-2026-008' })
  })
  it('v3 repo trunca en 1000 → se corrige', () => {
    expect(interpretarRespuestaNumeracion(conAño('RS', 2026, 1000))).toMatchObject({
      valido: true, numeroCompleto: 'RS-2026-1000', corregidoTruncado: true,
    })
  })
  it('v4 ya no trunca → sin corrección', () => {
    expect(interpretarRespuestaNumeracion(conAño('RS', 2026, 1000, '1000'))).toMatchObject({
      valido: true, numeroCompleto: 'RS-2026-1000', corregidoTruncado: false,
    })
  })
})

describe('interpretarRespuestaNumeracion — respuestas no válidas (se rechazan)', () => {
  it.each([
    ['null', null],
    ['sin prefijo', { numero: 1, numero_completo: 'FA-001' }],
    ['prefijo vacío', { prefijo: ' ', numero: 1, numero_completo: '-001' }],
    ['sin numero', { prefijo: 'FA', numero_completo: 'FA-001' }],
    ['numero 0', { prefijo: 'FA', numero: 0, numero_completo: 'FA-000' }],
    ['numero decimal', { prefijo: 'FA', numero: 1.5, numero_completo: 'FA-1.5' }],
    ['numero como texto', { prefijo: 'FA', numero: '1', numero_completo: 'FA-001' }],
    ['año no entero', { prefijo: 'FA', año: '2026', numero: 1, numero_completo: 'FA-2026-001' }],
  ])('%s', (_, data) => {
    expect(interpretarRespuestaNumeracion(data).valido).toBe(false)
  })

  it('formato inesperado por debajo de 1000 → se rechaza en vez de inventar', () => {
    const r = interpretarRespuestaNumeracion({ prefijo: 'FA', numero: 8, numero_completo: 'FA/2026/8' })
    expect(r.valido).toBe(false)
  })
})
