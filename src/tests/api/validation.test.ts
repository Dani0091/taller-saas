/**
 * Tests para validación de datos de API
 * Validación de campos, sanitización, límites
 */

import { describe, it, expect } from 'vitest'

// Funciones de validación
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validateCIF = (cif: string): boolean => {
  // Validación básica de CIF/NIF español
  const cifRegex = /^[A-Z][0-9]{7}[A-Z0-9]$/i
  const nifRegex = /^[0-9]{8}[A-Z]$/i
  return cifRegex.test(cif) || nifRegex.test(cif)
}

const validateIBAN = (iban: string): boolean => {
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase()
  // IBAN español: ES + 22 dígitos
  const ibanRegex = /^ES[0-9]{22}$/
  return ibanRegex.test(cleanIBAN)
}

const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/[\s-]/g, '')
  // Teléfonos españoles: 9 dígitos empezando por 6, 7, 8 o 9
  const phoneRegex = /^[6789][0-9]{8}$/
  return phoneRegex.test(cleanPhone)
}

const sanitizeHTML = (text: string): string => {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const validateTarifaHora = (tarifa: number): boolean => {
  return tarifa >= 0 && tarifa <= 1000
}

const validatePorcentajeIVA = (iva: number): boolean => {
  const validIVA = [0, 4, 10, 21] // Tipos de IVA en España
  return validIVA.includes(iva)
}

describe('Validación de Email', () => {
  it('acepta emails válidos', () => {
    expect(validateEmail('usuario@ejemplo.com')).toBe(true)
    expect(validateEmail('test.user@empresa.es')).toBe(true)
    expect(validateEmail('info@sub.dominio.org')).toBe(true)
  })

  it('rechaza emails inválidos', () => {
    expect(validateEmail('noesunmail')).toBe(false)
    expect(validateEmail('falta@dominio')).toBe(false)
    expect(validateEmail('@sinusuario.com')).toBe(false)
    expect(validateEmail('espacios en@mail.com')).toBe(false)
  })
})

describe('Validación de CIF/NIF', () => {
  it('acepta CIF válidos', () => {
    expect(validateCIF('B12345678')).toBe(true)
    expect(validateCIF('A98765432')).toBe(true)
  })

  it('acepta NIF válidos', () => {
    expect(validateCIF('12345678Z')).toBe(true)
    expect(validateCIF('87654321A')).toBe(true)
  })

  it('rechaza formatos inválidos', () => {
    expect(validateCIF('1234')).toBe(false)
    expect(validateCIF('ABCDEFGHI')).toBe(false)
    expect(validateCIF('')).toBe(false)
  })
})

describe('Validación de IBAN', () => {
  it('acepta IBAN español válido', () => {
    expect(validateIBAN('ES7921000813610123456789')).toBe(true)
    expect(validateIBAN('ES79 2100 0813 6101 2345 6789')).toBe(true)
  })

  it('rechaza IBAN con longitud incorrecta', () => {
    expect(validateIBAN('ES79210008')).toBe(false)
    expect(validateIBAN('')).toBe(false)
  })

  it('rechaza IBAN de otros países', () => {
    expect(validateIBAN('DE89370400440532013000')).toBe(false)
    expect(validateIBAN('FR7630006000011234567890189')).toBe(false)
  })
})

describe('Validación de Teléfono', () => {
  it('acepta teléfonos móviles', () => {
    expect(validatePhone('612345678')).toBe(true)
    expect(validatePhone('712345678')).toBe(true)
  })

  it('acepta teléfonos fijos', () => {
    expect(validatePhone('912345678')).toBe(true)
    expect(validatePhone('812345678')).toBe(true)
  })

  it('acepta con formato', () => {
    expect(validatePhone('612 345 678')).toBe(true)
    expect(validatePhone('612-345-678')).toBe(true)
  })

  it('rechaza teléfonos inválidos', () => {
    expect(validatePhone('12345')).toBe(false)
    expect(validatePhone('012345678')).toBe(false) // No empieza por 6-9
  })
})

describe('Sanitización HTML', () => {
  it('escapa caracteres peligrosos', () => {
    expect(sanitizeHTML('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
  })

  it('escapa comillas', () => {
    expect(sanitizeHTML("It's a test")).toBe("It&#39;s a test")
  })

  it('mantiene texto normal', () => {
    expect(sanitizeHTML('Texto normal sin HTML')).toBe('Texto normal sin HTML')
  })
})

describe('Validación de Tarifa por Hora', () => {
  it('acepta tarifas válidas', () => {
    expect(validateTarifaHora(35)).toBe(true)
    expect(validateTarifaHora(0)).toBe(true)
    expect(validateTarifaHora(100)).toBe(true)
  })

  it('rechaza tarifas negativas', () => {
    expect(validateTarifaHora(-10)).toBe(false)
  })

  it('rechaza tarifas excesivas', () => {
    expect(validateTarifaHora(1500)).toBe(false)
  })
})

describe('Validación de Porcentaje IVA', () => {
  it('acepta tipos de IVA españoles', () => {
    expect(validatePorcentajeIVA(21)).toBe(true)
    expect(validatePorcentajeIVA(10)).toBe(true)
    expect(validatePorcentajeIVA(4)).toBe(true)
    expect(validatePorcentajeIVA(0)).toBe(true)
  })

  it('rechaza tipos de IVA inválidos', () => {
    expect(validatePorcentajeIVA(15)).toBe(false)
    expect(validatePorcentajeIVA(25)).toBe(false)
  })
})
