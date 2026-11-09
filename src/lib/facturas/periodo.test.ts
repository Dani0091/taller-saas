import { describe, it, expect } from 'vitest'
import { rangoPeriodo } from './periodo'
import { textoBusqueda } from '@/infrastructure/repositories/supabase/factura.repository'

// Miércoles 12 de noviembre de 2026, 10:00 hora local
const hoy = new Date(2026, 10, 12, 10, 0)

describe('rangoPeriodo', () => {
  it.each([
    ['todas', {}],
    ['hoy', { fechaDesde: '2026-11-12', fechaHasta: '2026-11-12' }],
    ['semana', { fechaDesde: '2026-11-09', fechaHasta: '2026-11-12' }], // semana desde el lunes
    ['mes', { fechaDesde: '2026-11-01', fechaHasta: '2026-11-12' }],
    ['3meses', { fechaDesde: '2026-08-12', fechaHasta: '2026-11-12' }],
    ['año', { fechaDesde: '2026-01-01', fechaHasta: '2026-11-12' }],
  ] as const)('%s', (periodo, esperado) => {
    expect(rangoPeriodo(periodo, undefined, hoy)).toEqual(esperado)
  })

  it('a las 00:30 "hoy" sigue siendo el día local (no el anterior en UTC)', () => {
    expect(rangoPeriodo('hoy', undefined, new Date(2026, 10, 12, 0, 30))).toEqual({ fechaDesde: '2026-11-12', fechaHasta: '2026-11-12' })
  })

  it('personalizado: solo desde, solo hasta, al revés y valores inválidos', () => {
    expect(rangoPeriodo('personalizado', { from: '2026-10-01', to: '' }, hoy)).toEqual({ fechaDesde: '2026-10-01', fechaHasta: undefined })
    expect(rangoPeriodo('personalizado', { from: '', to: '2026-10-31' }, hoy)).toEqual({ fechaDesde: undefined, fechaHasta: '2026-10-31' })
    expect(rangoPeriodo('personalizado', { from: '2026-10-31', to: '2026-10-01' }, hoy)).toEqual({ fechaDesde: '2026-10-01', fechaHasta: '2026-10-31' })
    expect(rangoPeriodo('personalizado', { from: 'ayer', to: '31/10/2026' }, hoy)).toEqual({ fechaDesde: undefined, fechaHasta: undefined })
  })
})

describe('rangoPeriodo: trimestres fiscales', () => {
  it('el trimestre filtra del primer al último día', () => {
    expect(rangoPeriodo('2026-T4')).toEqual({ fechaDesde: '2026-10-01', fechaHasta: '2026-12-31' })
    expect(rangoPeriodo('2024-T1')).toEqual({ fechaDesde: '2024-01-01', fechaHasta: '2024-03-31' })
  })
})

describe('textoBusqueda (filtro .or() de PostgREST)', () => {
  it('conserva número, matrícula y NIF', () => {
    expect(textoBusqueda('FA-012')).toBe('FA-012')
    expect(textoBusqueda('  1234   BCD ')).toBe('1234 BCD')
    expect(textoBusqueda('B12345678')).toBe('B12345678')
  })

  it('quita lo que rompería o inyectaría condiciones', () => {
    expect(textoBusqueda('a,taller_id.neq.x')).toBe('a taller id neq x')
    expect(textoBusqueda('x)or(id.gt.0')).toBe('x or id gt 0')
    expect(textoBusqueda('100%_*')).toBe('100')
  })

  it('vacío o solo símbolos → undefined', () => {
    expect(textoBusqueda('')).toBeUndefined()
    expect(textoBusqueda(undefined)).toBeUndefined()
    expect(textoBusqueda(' ,.() ')).toBeUndefined()
  })
})
