import { describe, it, expect, vi, afterEach } from 'vitest'
import { NumeroFactura } from './NumeroFactura.vo'

afterEach(() => vi.restoreAllMocks())

// Formatos reales vistos en producción (logs de Railway, 2026-11): PREFIJO-NNN.
const PRODUCCION = ['RS-016', 'RS-102', 'RS-106', 'SCR-007', 'SCR-016', 'FA-001']

describe('NumeroFactura.fromStringFlexible — formato de producción PREFIJO-NNN', () => {
  it.each(PRODUCCION)('%s: conserva el valor exacto al formatear', (valor) => {
    const n = NumeroFactura.fromStringFlexible(valor, 2026)
    expect(n.format()).toBe(valor)
    expect(n.toString()).toBe(valor)
    expect(n.toJSON()).toBe(valor)
  })

  it('no escribe avisos en el log (era ruido en cada listado)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    PRODUCCION.forEach((v) => NumeroFactura.fromStringFlexible(v, 2026))
    expect(warn).not.toHaveBeenCalled()
  })

  it('extrae serie y secuencial', () => {
    const n = NumeroFactura.fromStringFlexible('SCR-016', 2026)
    expect(n.getSerie().valor).toBe('SCR')
    expect(n.getSecuencial()).toBe(16)
  })

  it('usa el año de referencia (fecha de emisión), no el año actual', () => {
    expect(NumeroFactura.fromStringFlexible('RS-016', 2025).getAño()).toBe(2025)
  })

  it('sin año de referencia mantiene el comportamiento anterior (año actual)', () => {
    expect(NumeroFactura.fromStringFlexible('RS-016').getAño()).toBe(new Date().getFullYear())
  })

  it('números de 4 dígitos (≥1000) se conservan sin truncar', () => {
    expect(NumeroFactura.fromStringFlexible('RS-1000', 2026).format()).toBe('RS-1000')
  })
})

describe('NumeroFactura.fromStringFlexible — otros formatos (sin cambios)', () => {
  it('estándar SERIE-AAAA-N se interpreta con su propio año', () => {
    const n = NumeroFactura.fromStringFlexible('F-2026-000123', 2020)
    expect(n.getAño()).toBe(2026)
    expect(n.getSecuencial()).toBe(123)
  })

  it('formato antiguo sin guion sigue avisando y conservando el valor', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(NumeroFactura.fromStringFlexible('FA014').format()).toBe('FA014')
    expect(warn).toHaveBeenCalledOnce()
  })
})
