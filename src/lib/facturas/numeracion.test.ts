import { describe, it, expect, vi, afterEach } from 'vitest'
import { asignarNumeroFactura, RPC_NUMERACION, RPC_NUMERACION_ANTERIOR } from './numeracion'

type RespuestaRpc = { data: unknown; error: { message: string; code?: string } | null }

function mockSupabase(respuesta: RespuestaRpc) {
  const rpc = vi.fn().mockResolvedValue(respuesta)
  return { client: { rpc } as never, rpc }
}

// Forma exacta de la respuesta de la v3 instalada en producción.
const v3Prod = (prefijo: string, numero: number, numero_completo: string) => ({
  data: { prefijo, numero, numero_completo },
  error: null,
})

afterEach(() => vi.restoreAllMocks())

describe('asignarNumeroFactura', () => {
  it('llama a la RPC vigente con taller y prefijo', async () => {
    const { client, rpc } = mockSupabase(v3Prod('FA', 1, 'FA-001'))
    await asignarNumeroFactura(client, 'taller-qa-a', 'FA')
    expect(rpc).toHaveBeenCalledWith(RPC_NUMERACION, { p_taller_id: 'taller-qa-a', p_prefijo: 'FA' })
  })

  it('la RPC vigente es v4 (A06) y la anterior v3', () => {
    expect(RPC_NUMERACION).toBe('asignar_numero_factura_v4')
    expect(RPC_NUMERACION_ANTERIOR).toBe('asignar_numero_factura_v3')
  })

  it('éxito < 1000 → el mismo numero_completo que la RPC', async () => {
    const { client } = mockSupabase(v3Prod('FS', 42, 'FS-042'))
    expect(await asignarNumeroFactura(client, 't', 'FS')).toEqual({ ok: true, numeroCompleto: 'FS-042' })
  })

  it('1000 truncado por la RPC → FS-1000 y aviso en log', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { client } = mockSupabase(v3Prod('FS', 1000, 'FS-100'))
    expect(await asignarNumeroFactura(client, 't', 'FS')).toEqual({ ok: true, numeroCompleto: 'FS-1000' })
    expect(warn).toHaveBeenCalledOnce()
  })

  it('error de la RPC → ok:false con su mensaje', async () => {
    const { client } = mockSupabase({ data: null, error: { message: 'permission denied' } })
    expect(await asignarNumeroFactura(client, 't', 'FA')).toEqual({ ok: false, errorMessage: 'permission denied' })
  })

  it('sin datos ni error → ok:false sin mensaje (la ruta pone su texto por defecto)', async () => {
    const { client } = mockSupabase({ data: null, error: null })
    expect(await asignarNumeroFactura(client, 't', 'FA')).toEqual({ ok: false, errorMessage: undefined })
  })

  it('respuesta sin numero → ok:false (nunca emite con número indefinido)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { client } = mockSupabase({ data: { numero_completo: 'FA-001' }, error: null })
    const r = await asignarNumeroFactura(client, 't', 'FA')
    expect(r.ok).toBe(false)
  })
})

describe('asignarNumeroFactura · vuelta a v3', () => {
  function mockSecuencia(...respuestas: RespuestaRpc[]) {
    const rpc = vi.fn()
    for (const r of respuestas) rpc.mockResolvedValueOnce(r)
    return { client: { rpc } as never, rpc }
  }
  const sinAcceso = { data: null, error: { code: 'P0001', message: 'Sin acceso a la numeración de este taller' } }
  const noExiste = { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }

  it.each([['usuario sin auth_id', sinAcceso], ['v4 no instalada', noExiste]])(
    '%s → reintenta con v3, mismo número y error en log',
    async (_caso, fallo) => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { client, rpc } = mockSecuencia(fallo, v3Prod('FA', 88, 'FA-088'))
      expect(await asignarNumeroFactura(client, 't', 'FA')).toEqual({ ok: true, numeroCompleto: 'FA-088' })
      expect(rpc.mock.calls.map((c) => c[0])).toEqual([RPC_NUMERACION, RPC_NUMERACION_ANTERIOR])
      expect(rpc).toHaveBeenLastCalledWith(RPC_NUMERACION_ANTERIOR, { p_taller_id: 't', p_prefijo: 'FA' })
      expect(log).toHaveBeenCalledOnce()
    }
  )

  it('otros errores de v4 no reintentan (no se arriesga a gastar dos números)', async () => {
    const { client, rpc } = mockSecuencia({ data: null, error: { code: '40001', message: 'could not serialize' } })
    expect(await asignarNumeroFactura(client, 't', 'FA')).toEqual({ ok: false, errorMessage: 'could not serialize' })
    expect(rpc).toHaveBeenCalledOnce()
  })

  it('si v3 también falla → ok:false con el error de v3', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { client } = mockSecuencia(sinAcceso, { data: null, error: { message: 'permission denied' } })
    expect(await asignarNumeroFactura(client, 't', 'FA')).toEqual({ ok: false, errorMessage: 'permission denied' })
  })
})
