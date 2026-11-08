import { describe, it, expect } from 'vitest'
import { calcularTotalesPresupuesto, versionPresupuesto, redondearImporte, ivaDeOrden, type LineaPresupuesto } from './version-presupuesto'

const mo: LineaPresupuesto = { id: 'a', tipo: 'mano_obra', descripcion: 'Mano de obra', cantidad: 2, precio_unitario: 40 }
const pieza: LineaPresupuesto = { id: 'b', tipo: 'pieza', descripcion: 'Filtro', cantidad: 1, precio_unitario: 15.5 }
const suplido: LineaPresupuesto = { id: 'c', tipo: 'suplido', descripcion: 'ITV', cantidad: 1, precio_unitario: 40 }

describe('calcularTotalesPresupuesto', () => {
  it('suma por tipo y el suplido no lleva IVA', () => {
    const t = calcularTotalesPresupuesto([mo, pieza, suplido], 21)
    expect(t.manoObra).toBe(80)
    expect(t.piezas).toBe(15.5)
    expect(t.subtotal).toBe(135.5)
    expect(redondearImporte(t.iva)).toBe(20.06) // (80 + 15,5) × 21 %
    expect(redondearImporte(t.total)).toBe(155.56)
  })

  it('sin líneas → todo 0', () => {
    expect(calcularTotalesPresupuesto([], 21)).toEqual({ manoObra: 0, piezas: 0, subtotal: 0, iva: 0, total: 0 })
  })
})

describe('versionPresupuesto', () => {
  const v = versionPresupuesto([mo, pieza], 21)

  it('es un SHA-256 hex', () => expect(v).toMatch(/^[0-9a-f]{64}$/))

  it('no depende del orden de las líneas ni de 50 vs "50.00"', () => {
    expect(versionPresupuesto([pieza, mo], 21)).toBe(v)
    expect(versionPresupuesto([{ ...mo, precio_unitario: '40.00' as unknown as number }, pieza], 21)).toBe(v)
  })

  it.each([
    ['precio', [{ ...mo, precio_unitario: 41 }, pieza], 21],
    ['cantidad', [{ ...mo, cantidad: 3 }, pieza], 21],
    ['descripción', [{ ...mo, descripcion: 'Otra' }, pieza], 21],
    ['tipo', [{ ...mo, tipo: 'pieza' }, pieza], 21],
    ['línea añadida', [mo, pieza, suplido], 21],
    ['línea quitada', [mo], 21],
    ['IVA de la orden', [mo, pieza], 0],
  ] as const)('cambia si cambia: %s', (_caso, lineas, iva) => {
    expect(versionPresupuesto([...lineas], iva)).not.toBe(v)
  })
})

describe('ivaDeOrden', () => {
  it('orden > taller > 21, y 0 es un valor válido', () => {
    expect(ivaDeOrden(10, 21)).toBe(10)
    expect(ivaDeOrden(0, 21)).toBe(0)
    expect(ivaDeOrden(null, 10)).toBe(10)
    expect(ivaDeOrden(undefined, null)).toBe(21)
  })
})
