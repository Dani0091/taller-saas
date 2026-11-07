import { describe, it, expect, vi } from 'vitest'
import { getUsuarioTaller } from './usuario-taller'

function mockSupabase(user: { email: string } | null, usuario: { taller_id: string | null } | null) {
  const eq = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: usuario }) })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from,
  }
  return { client: client as never, from, select, eq }
}

describe('getUsuarioTaller', () => {
  it('sin sesión → 401 y no consulta usuarios', async () => {
    const { client, from } = mockSupabase(null, null)
    expect(await getUsuarioTaller(client)).toEqual({ error: 'No autorizado', status: 401 })
    expect(from).not.toHaveBeenCalled()
  })

  it('perfil inexistente → 403', async () => {
    const { client } = mockSupabase({ email: 'a@qa.test' }, null)
    expect(await getUsuarioTaller(client)).toEqual({ error: 'Usuario sin taller asignado', status: 403 })
  })

  it('perfil sin taller_id → 403', async () => {
    const { client } = mockSupabase({ email: 'a@qa.test' }, { taller_id: null })
    expect(await getUsuarioTaller(client)).toEqual({ error: 'Usuario sin taller asignado', status: 403 })
  })

  it('perfil con taller → tallerId, buscando por email de la sesión', async () => {
    const { client, from, select, eq } = mockSupabase({ email: 'a@qa.test' }, { taller_id: 'taller-qa-a' })
    expect(await getUsuarioTaller(client)).toEqual({ tallerId: 'taller-qa-a' })
    expect(from).toHaveBeenCalledWith('usuarios')
    expect(select).toHaveBeenCalledWith('taller_id')
    expect(eq).toHaveBeenCalledWith('email', 'a@qa.test')
  })
})
