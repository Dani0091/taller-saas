import { describe, it, expect } from 'vitest'
import { formatCurrency } from './utils'

describe('formatCurrency', () => {
  it('«1.383,95 €»: miles desde 4 cifras y espacio irrompible antes del símbolo', () => {
    expect(formatCurrency(1383.95)).toBe('1.383,95\u00a0€')
    expect(formatCurrency(12345.5)).toBe('12.345,50\u00a0€')
    expect(formatCurrency(-50)).toBe('-50,00\u00a0€')
    expect(formatCurrency(null)).toBe('0,00\u00a0€')
    expect(formatCurrency(1383.95, false)).toBe('1.383,95')
  })
})
