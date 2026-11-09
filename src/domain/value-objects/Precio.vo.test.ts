import { describe, it, expect } from 'vitest'
import { Precio } from './Precio.vo'

describe('Precio.format', () => {
  it('«1.513,11 €» igual que formatCurrency (antes «1513,11 €» en el listado de facturas)', () => {
    expect(Precio.create(1513.11).format()).toBe('1.513,11 €')
    expect(Precio.create(1513.11).formatSinSimbolo()).toBe('1.513,11')
    expect(Precio.create(36.3).format()).toBe('36,30 €')
  })
})
