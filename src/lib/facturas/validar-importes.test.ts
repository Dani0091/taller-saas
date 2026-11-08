import { describe, it, expect } from 'vitest'
import { validarImportesFactura } from './validar-importes'

const CAMPOS = ['base_imponible', 'iva', 'total'] as const

describe('validarImportesFactura', () => {
  it('importes normales y ausentes son válidos', () => {
    expect(validarImportesFactura({ base_imponible: 100, iva: 21, total: 121 }, CAMPOS)).toBeNull()
    expect(validarImportesFactura({}, CAMPOS)).toBeNull()
    expect(validarImportesFactura({ base_imponible: 0, iva: 0, total: 0 }, CAMPOS)).toBeNull()
  })

  it.each([
    [{ total: -121 }, /negativo/],
    [{ iva: -0.01 }, /negativo/],
    [{ total: 'cien' }, /número/],
    [{ total: '121' }, /número/],
    [{ total: NaN }, /número/],
    [{ total: Infinity }, /número/],
    [{ total: 1e308 }, /rango/],
    [{ base_imponible: true }, /número/],
  ])('%j → error', (importes, patron) => {
    expect(validarImportesFactura(importes, CAMPOS)).toMatch(patron)
  })
})
