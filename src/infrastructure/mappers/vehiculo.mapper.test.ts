import { describe, it, expect, vi, afterEach } from 'vitest'
import { VehiculoMapper, type VehiculoDbRecord } from './vehiculo.mapper'

afterEach(() => vi.restoreAllMocks())

const registro = (matricula: string): VehiculoDbRecord => ({
  id: 'vehiculo-qa-1',
  taller_id: 'taller-qa-a',
  matricula,
  marca: 'Seat',
  modelo: 'León',
} as VehiculoDbRecord)

describe('VehiculoMapper — matrícula', () => {
  it('una matrícula española válida se normaliza como siempre', () => {
    expect(VehiculoMapper.toDomain(registro('1234BCD')).getMatricula().valor).toBe('1234-BCD')
  })

  // Extranjeras, históricas, de remolque o mal escritas: existen en producción
  it.each(['AB123CD', 'M123456', 'E1234BCD', '909262QAE', 'GE 123-AB'])(
    'matrícula no estándar «%s» se conserva (antes se mostraba y se guardaba como 0000-XXX)',
    (matricula) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const v = VehiculoMapper.toDomain(registro(matricula))
      expect(v.getMatricula().valor).toBe(matricula.toUpperCase())
      expect(VehiculoMapper.toPersistence(v).matricula).toBe(matricula.toUpperCase())
    }
  )
})
