/**
 * Tests para patrones de detección de matrículas españolas
 * Cobertura: formato nuevo, antiguo, motos, especiales
 */

import { describe, it, expect } from 'vitest'

// Patrones mejorados para matrículas españolas
const MATRICULA_PATTERNS = [
  // Nuevo formato con espacio o guión: 1234 ABC, 1234-ABC, 1234ABC
  /([0-9]{4})[\s-]*([A-Z]{3})/gi,
  // Formato antiguo con provincia: M 1234 AB o M-1234-AB
  /\b([A-Z]{1,2})[\s-]*([0-9]{4})[\s-]*([A-Z]{2,3})\b/gi,
  // Motos y remolques: 1234 AB
  /([0-9]{4})[\s-]*([A-Z]{2})\b/gi,
]

function extraerMatricula(texto: string): string | null {
  const textoLimpio = texto.toUpperCase().replace(/[^A-Z0-9\s-]/g, '')

  for (const pattern of MATRICULA_PATTERNS) {
    pattern.lastIndex = 0
    const match = pattern.exec(textoLimpio)
    if (match) {
      const matriculaRaw = match[0].replace(/\s+/g, '').replace(/-+/g, '')
      if (matriculaRaw.length >= 5 && matriculaRaw.length <= 10) {
        return matriculaRaw.toUpperCase()
      }
    }
  }
  return null
}

describe('Detección de Matrículas Españolas', () => {
  describe('Formato Nuevo (post-2000)', () => {
    it('detecta matrícula formato 1234ABC', () => {
      expect(extraerMatricula('Vehículo con matrícula 1234ABC')).toBe('1234ABC')
    })

    it('detecta matrícula con espacios 1234 ABC', () => {
      expect(extraerMatricula('Matrícula: 1234 ABC')).toBe('1234ABC')
    })

    it('detecta matrícula con guión 1234-ABC', () => {
      expect(extraerMatricula('Coche 1234-ABC aparcado')).toBe('1234ABC')
    })

    it('detecta matrícula con ruido OCR', () => {
      expect(extraerMatricula('Mat: 5678 BCD  KM: 125000')).toBe('5678BCD')
    })
  })

  describe('Formato Antiguo (pre-2000)', () => {
    it('detecta matrícula provincial M-1234-AB', () => {
      expect(extraerMatricula('Vehículo M-1234-AB')).toBe('M1234AB')
    })

    it('detecta matrícula provincial sin guiones M 1234 AB', () => {
      expect(extraerMatricula('M 1234 AB')).toBe('M1234AB')
    })

    it('detecta matrícula con provincia larga BA-1234-CD', () => {
      expect(extraerMatricula('BA-1234-CD')).toBe('BA1234CD')
    })
  })

  describe('Casos especiales', () => {
    it('no detecta números sin letras', () => {
      expect(extraerMatricula('123456789')).toBeNull()
    })

    it('no detecta texto sin patrón de matrícula', () => {
      expect(extraerMatricula('Hola mundo')).toBeNull()
    })

    it('detecta matrícula en texto largo', () => {
      const texto = `
        TALLER MECÁNICO EL RÁPIDO
        Cliente: Juan García
        Vehículo: Ford Focus
        Matrícula: 4521 BBK
        Km entrada: 145.230
      `
      expect(extraerMatricula(texto)).toBe('4521BBK')
    })

    it('ignora caracteres especiales', () => {
      expect(extraerMatricula('Mat.: 1234!@#ABC')).toBe('1234ABC')
    })
  })

  describe('Validación de longitud', () => {
    it('acepta matrículas de 7 caracteres', () => {
      expect(extraerMatricula('1234ABC')).toBe('1234ABC')
    })

    it('acepta matrículas provinciales de 8 caracteres', () => {
      // M-1234-AB formato antiguo con separadores
      expect(extraerMatricula('M-1234-AB')).toBe('M1234AB')
    })

    it('rechaza strings muy cortos', () => {
      expect(extraerMatricula('AB12')).toBeNull()
    })
  })
})

describe('Detección de Kilometraje', () => {
  const KM_PATTERNS = [
    /\b([0-9]{1,3}(?:[.,][0-9]{3})*)\s*(?:km|kms|kilómetros|kilometros)\b/gi,
    /\bkm\s*[:=]?\s*([0-9]{1,3}(?:[.,][0-9]{3})*)\b/gi,
    /\b([0-9]{3,6})\s*(?:km|kms)\b/gi,
  ]

  function extraerKilometraje(texto: string): number | null {
    for (const pattern of KM_PATTERNS) {
      pattern.lastIndex = 0
      const match = pattern.exec(texto)
      if (match) {
        const kmStr = match[1].replace(/[.,]/g, '')
        const km = parseInt(kmStr, 10)
        if (km >= 10 && km <= 999999) {
          return km
        }
      }
    }
    return null
  }

  it('detecta km simple', () => {
    expect(extraerKilometraje('145000 km')).toBe(145000)
  })

  it('detecta km con separador de miles', () => {
    expect(extraerKilometraje('145.000 km')).toBe(145000)
  })

  it('detecta km con prefijo y unidad', () => {
    expect(extraerKilometraje('Km: 89500 km')).toBe(89500)
  })

  it('detecta kilómetros escrito completo', () => {
    expect(extraerKilometraje('89500 kms')).toBe(89500)
  })

  it('rechaza valores fuera de rango', () => {
    expect(extraerKilometraje('5 km')).toBeNull() // Muy bajo
  })

  it('no detecta si no hay unidad', () => {
    expect(extraerKilometraje('145000')).toBeNull()
  })
})
