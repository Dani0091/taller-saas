import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string; email: string } | null
  usuario: { taller_id: string | null } | null
} = { user: null, usuario: null }

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: state.usuario, error: state.usuario ? null : { message: 'no rows' } }),
        }),
      }),
    }),
  }),
}))

import { getAuthenticatedUser } from './middleware'

beforeEach(() => {
  state.user = null
  state.usuario = null
})

describe('getAuthenticatedUser', () => {
  it('sin sesión → 401', async () => {
    expect(await getAuthenticatedUser()).toEqual({ error: 'No autenticado', status: 401 })
  })

  it('sesión sin perfil → 403', async () => {
    state.user = { id: 'u1', email: 'a@qa.test' }
    expect(await getAuthenticatedUser()).toEqual({ error: 'Usuario no encontrado', status: 403 })
  })

  it('perfil sin taller_id → 403 (antes devolvía tallerId null)', async () => {
    state.user = { id: 'u1', email: 'a@qa.test' }
    state.usuario = { taller_id: null }
    expect(await getAuthenticatedUser()).toEqual({ error: 'Usuario sin taller asignado', status: 403 })
  })

  it('perfil con taller → datos de sesión', async () => {
    state.user = { id: 'u1', email: 'a@qa.test' }
    state.usuario = { taller_id: 'taller-qa-a' }
    expect(await getAuthenticatedUser()).toEqual({ userId: 'u1', email: 'a@qa.test', tallerId: 'taller-qa-a' })
  })
})
