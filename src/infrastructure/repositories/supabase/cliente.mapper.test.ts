import { describe, it, expect, vi, afterEach } from 'vitest'
import { ClienteMapper, type ClienteDBRecord } from './cliente.mapper'

afterEach(() => vi.restoreAllMocks())

const base = (nif?: string): ClienteDBRecord => ({
  id: 'cliente-qa-1',
  taller_id: 'taller-qa-a',
  nombre: 'Cliente QA',
  nif,
})

describe('ClienteMapper.toDomain — NIF', () => {
  it('NIF válido se mantiene', () => {
    const c = ClienteMapper.toDomain(base('12345678Z'))
    expect(c.toPlainObject().nif).toBe('12345678Z')
  })

  // Tipos de valores históricos vistos en producción (no son NIF reales de nadie).
  it.each(['3473HNK', '629962388', '19885226H', 'A', '0', 'CIVIC 0539GHJ'])(
    'NIF histórico no válido "%s" se conserva, no se cambia por 00000000T',
    (valor) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const c = ClienteMapper.toDomain(base(valor))
      expect(c.toPlainObject().nif).toBe(valor.toUpperCase().trim())
      expect(c.toPlainObject().nif).not.toBe('00000000T')
    }
  )

  it('al guardar (toPersistence) no se pierde el NIF histórico', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const c = ClienteMapper.toDomain(base('3473HNK'))
    expect(ClienteMapper.toPersistence(c).nif).toBe('3473HNK')
  })

  it('el aviso no incluye el valor del NIF ni la traza', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    ClienteMapper.toDomain(base('629962388'))
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]).toHaveLength(1)
    expect(String(warn.mock.calls[0][0])).not.toContain('629962388')
  })

  it('NIF vacío o solo espacios mantiene el comportamiento anterior', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(ClienteMapper.toDomain(base(undefined)).toPlainObject().nif).toBe('00000000T')
    expect(ClienteMapper.toDomain(base('   ')).toPlainObject().nif).toBe('00000000T')
  })

  it('cliente sin NIF: no se muestra un NIF inventado ni se guarda 00000000T', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const c = ClienteMapper.toDomain(base(undefined))
    expect(c.toDTO().nif).toBe('')
    expect(c.toDTO().nifMasked).toBe('')
    expect(ClienteMapper.toPersistence(c).nif).toBeUndefined()
  })

  it('cliente con NIF real: igual que siempre', () => {
    const c = ClienteMapper.toDomain(base('12345678Z'))
    expect(c.toDTO().nif).toBe('12345678Z')
    expect(ClienteMapper.toPersistence(c).nif).toBe('12345678Z')
  })
})
