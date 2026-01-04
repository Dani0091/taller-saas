/**
 * Tests para utilidades de formateo
 * Moneda, fechas, números
 */

import { describe, it, expect } from 'vitest'

// Funciones de formateo típicas de la app
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('es-ES').format(num)
}

const formatIBAN = (iban: string): string => {
  // Formatear IBAN en grupos de 4
  return iban.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') || iban
}

const formatFacturaNumber = (serie: string, numero: number, padding: number = 3): string => {
  return `${serie}${numero.toString().padStart(padding, '0')}`
}

describe('Formateo de Moneda', () => {
  it('formatea euros correctamente', () => {
    const result = formatCurrency(1234.56)
    // Verificar que contiene el símbolo de euro y el valor
    expect(result).toContain('€')
    expect(result).toMatch(/1[.,]?234/) // Puede variar según locale
  })

  it('formatea cero', () => {
    expect(formatCurrency(0)).toContain('0,00')
  })

  it('formatea negativos', () => {
    expect(formatCurrency(-50)).toContain('50,00')
  })

  it('formatea miles', () => {
    expect(formatCurrency(10000)).toContain('10.000')
  })
})

describe('Formateo de Fechas', () => {
  it('formatea fecha ISO correctamente', () => {
    const result = formatDate('2024-03-15')
    expect(result).toContain('15')
    expect(result).toContain('marzo')
    expect(result).toContain('2024')
  })

  it('formatea fecha con hora', () => {
    const result = formatDate('2024-12-25T10:30:00Z')
    expect(result).toContain('25')
    expect(result).toContain('diciembre')
  })
})

describe('Formateo de Números', () => {
  it('formatea con separador de miles', () => {
    expect(formatNumber(1234567)).toBe('1.234.567')
  })

  it('formatea decimales', () => {
    const result = formatNumber(1234.56)
    expect(result).toMatch(/1[.,]?234/) // Separador puede variar
  })

  it('formatea cero', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

describe('Formateo de IBAN', () => {
  it('formatea IBAN español', () => {
    expect(formatIBAN('ES7921000813610123456789')).toBe('ES79 2100 0813 6101 2345 6789')
  })

  it('mantiene IBAN ya formateado', () => {
    expect(formatIBAN('ES79 2100 0813 6101 2345 6789')).toBe('ES79 2100 0813 6101 2345 6789')
  })

  it('maneja IBAN vacío', () => {
    expect(formatIBAN('')).toBe('')
  })
})

describe('Formateo de Número de Factura', () => {
  it('genera número con serie', () => {
    expect(formatFacturaNumber('FA', 1)).toBe('FA001')
  })

  it('genera número con padding personalizado', () => {
    expect(formatFacturaNumber('2024/', 42, 4)).toBe('2024/0042')
  })

  it('maneja números grandes', () => {
    expect(formatFacturaNumber('INV-', 999)).toBe('INV-999')
  })

  it('genera con serie compleja', () => {
    expect(formatFacturaNumber('A-2024-', 5, 3)).toBe('A-2024-005')
  })
})
