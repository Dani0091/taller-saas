import { describe, it, expect } from 'vitest'
import { siguienteNumeroOrden } from './numero-orden'

describe('siguienteNumeroOrden', () => {
  it.each([
    [undefined, 'OR-0001'],
    [null, 'OR-0001'],
    ['', 'OR-0001'],
    ['QA-OR-123', 'OR-0124'],
    ['OR-0007', 'OR-0008'],
    ['OR-0999', 'OR-1000'],
    ['OR-9999', 'OR-10000'],
    ['PEDIDO-12', 'OR-0001'],
  ])('%s → %s', (ultimo, esperado) => {
    expect(siguienteNumeroOrden(ultimo)).toBe(esperado)
  })
})
