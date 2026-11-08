import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('./calendar', async (original) => ({
  ...(await original<typeof import('./calendar')>()),
  createCalendarEvent: vi.fn(),
  updateCalendarEvent: vi.fn(),
  deleteCalendarEvent: vi.fn(),
  refreshAccessToken: vi.fn(),
}))

import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, refreshAccessToken } from './calendar'
import { eventoGoogleDeCita, sincronizarCitaEnGoogle, borrarCitaDeGoogle } from './sincronizar-cita'

// 09:00–10:30 en Madrid
const CITA = {
  id: 'cita-1', titulo: 'Revisión', fecha_inicio: '2026-11-15T08:00:00.000Z', fecha_fin: '2026-11-15T09:30:00.000Z',
  cliente: { nombre: 'Ana', apellidos: 'Gil', telefono: '600000001' }, vehiculo: { marca: 'Seat', modelo: 'Ibiza', matricula: '0000QAA' },
}
const EN_UNA_HORA = Date.now() + 3600_000

/** Supabase mínimo en memoria: filas por tabla y registro de escrituras. */
function falsoSupabase(filas: Record<string, Array<Record<string, unknown>>>) {
  const escrituras: Array<{ tabla: string; op: string; datos?: unknown; filtro: Record<string, unknown> }> = []
  const from = (tabla: string) => {
    const filtro: Record<string, unknown> = {}
    let op = 'select'
    let datos: unknown
    const coincide = () => (filas[tabla] ?? []).filter((f) => Object.entries(filtro).every(([k, v]) => f[k] === v))
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => { filtro[k] = v; return q },
      maybeSingle: async () => ({ data: coincide()[0] ?? null, error: null }),
      update: (d: unknown) => { op = 'update'; datos = d; return q },
      delete: () => { op = 'delete'; return q },
      insert: async (d: unknown) => { escrituras.push({ tabla, op: 'insert', datos: d, filtro: {} }); return { error: null } },
      then: (ok: (r: unknown) => void) => { escrituras.push({ tabla, op, datos, filtro: { ...filtro } }); ok({ error: null }) },
    }
    return q
  }
  return { cliente: { from } as unknown as SupabaseClient, escrituras }
}

beforeEach(() => vi.resetAllMocks())

describe('eventoGoogleDeCita', () => {
  it('cita con horario: instantes exactos en zona Madrid y datos del cliente', () => {
    const e = eventoGoogleDeCita(CITA, 'C/ Mayor 1')
    expect(e.start).toEqual({ dateTime: '2026-11-15T08:00:00.000Z', timeZone: 'Europe/Madrid' })
    expect(e.end).toEqual({ dateTime: '2026-11-15T09:30:00.000Z', timeZone: 'Europe/Madrid' })
    expect(e.summary).toBe('Revisión · Ana Gil')
    expect(e.description).toBe('Cliente: Ana Gil (600000001)\nVehículo: Seat Ibiza 0000QAA')
    expect(e.location).toBe('C/ Mayor 1')
  })

  it('todo el día: fechas de Madrid con fin exclusivo (no el día UTC)', () => {
    const e = eventoGoogleDeCita({ id: 'x', titulo: 'ITV', fecha_inicio: '2026-11-14T23:00:00.000Z', todo_el_dia: true })
    expect(e.start).toEqual({ date: '2026-11-15' })
    expect(e.end).toEqual({ date: '2026-11-16' })
  })

  it('sin fin dura una hora; cancelada se marca; sin datos no hay "undefined" ni "null"', () => {
    const e = eventoGoogleDeCita({ id: 'x', titulo: 'Aviso', fecha_inicio: CITA.fecha_inicio, fecha_fin: null, estado: 'cancelada', cliente: null })
    expect(e.end).toEqual({ dateTime: '2026-11-15T09:00:00.000Z', timeZone: 'Europe/Madrid' })
    expect(e.summary).toBe('CANCELADA · Aviso')
    expect(e.description).toBeUndefined()
    expect(JSON.stringify(e)).not.toMatch(/undefined|null/)
  })
})

describe('sincronizarCitaEnGoogle', () => {
  it('sin Google conectado no llama a Google ni escribe nada', async () => {
    const { cliente, escrituras } = falsoSupabase({})
    expect(await sincronizarCitaEnGoogle(cliente, { userId: 'u1', tallerId: 't1', cita: CITA })).toBe('sin-google')
    expect(createCalendarEvent).not.toHaveBeenCalled()
    expect(escrituras).toEqual([])
  })

  it('primera vez: crea el evento y guarda la referencia del usuario', async () => {
    const { cliente, escrituras } = falsoSupabase({ google_calendar_tokens: [{ user_id: 'u1', access_token: 'tok', expiry_date: EN_UNA_HORA }] })
    vi.mocked(createCalendarEvent).mockResolvedValue({ id: 'g-1', htmlLink: 'https://calendar.google.com/e/g-1' })
    expect(await sincronizarCitaEnGoogle(cliente, { userId: 'u1', tallerId: 't1', cita: CITA })).toBe('creado')
    expect(vi.mocked(createCalendarEvent).mock.calls[0][0]).toBe('tok')
    expect(escrituras).toEqual([{ tabla: 'google_calendar_events', op: 'insert', filtro: {}, datos: expect.objectContaining({
      user_id: 'u1', taller_id: 't1', tipo_referencia: 'cita', referencia_id: 'cita-1', google_event_id: 'g-1',
    }) }])
  })

  it('usa la dirección del taller como ubicación del evento', async () => {
    const { cliente } = falsoSupabase({
      google_calendar_tokens: [{ user_id: 'u1', access_token: 'tok', expiry_date: EN_UNA_HORA }],
      taller_config: [{ taller_id: 't1', direccion: 'C/ Taller 7' }, { taller_id: 't2', direccion: 'Otro taller' }],
    })
    vi.mocked(createCalendarEvent).mockResolvedValue({ id: 'g-1', htmlLink: '' })
    await sincronizarCitaEnGoogle(cliente, { userId: 'u1', tallerId: 't1', cita: CITA })
    expect(vi.mocked(createCalendarEvent).mock.calls[0][1].location).toBe('C/ Taller 7')
  })

  it('sin Google conectado ni siquiera consulta la configuración del taller', async () => {
    const { cliente } = falsoSupabase({})
    const from = vi.spyOn(cliente, 'from')
    await sincronizarCitaEnGoogle(cliente, { userId: 'u1', tallerId: 't1', cita: CITA })
    expect(from.mock.calls.map((c) => c[0])).toEqual(['google_calendar_tokens'])
  })

  it('con evento ya creado: actualiza ese evento, no crea otro', async () => {
    const { cliente } = falsoSupabase({
      google_calendar_tokens: [{ user_id: 'u1', access_token: 'tok', expiry_date: EN_UNA_HORA }],
      google_calendar_events: [{ id: 'ref-1', user_id: 'u1', tipo_referencia: 'cita', referencia_id: 'cita-1', google_event_id: 'g-1', calendar_id: 'primary' }],
    })
    vi.mocked(updateCalendarEvent).mockResolvedValue({ id: 'g-1', htmlLink: '' })
    expect(await sincronizarCitaEnGoogle(cliente, { userId: 'u1', tallerId: 't1', cita: CITA })).toBe('actualizado')
    expect(vi.mocked(updateCalendarEvent).mock.calls[0].slice(0, 2)).toEqual(['tok', 'g-1'])
    expect(createCalendarEvent).not.toHaveBeenCalled()
  })

  it('el evento de otro usuario no cuenta: cada usuario tiene el suyo', async () => {
    const { cliente } = falsoSupabase({
      google_calendar_tokens: [{ user_id: 'u2', access_token: 'tok2', expiry_date: EN_UNA_HORA }],
      google_calendar_events: [{ id: 'ref-1', user_id: 'u1', tipo_referencia: 'cita', referencia_id: 'cita-1', google_event_id: 'g-1' }],
    })
    vi.mocked(createCalendarEvent).mockResolvedValue({ id: 'g-2', htmlLink: '' })
    expect(await sincronizarCitaEnGoogle(cliente, { userId: 'u2', tallerId: 't1', cita: CITA })).toBe('creado')
    expect(updateCalendarEvent).not.toHaveBeenCalled()
  })

  it('token caducado: lo refresca, lo guarda y usa el nuevo', async () => {
    const { cliente, escrituras } = falsoSupabase({ google_calendar_tokens: [{ user_id: 'u1', access_token: 'viejo', refresh_token: 'r', expiry_date: Date.now() - 1 }] })
    vi.mocked(refreshAccessToken).mockResolvedValue({ access_token: 'nuevo', expires_in: 3600 })
    vi.mocked(createCalendarEvent).mockResolvedValue({ id: 'g-1', htmlLink: '' })
    expect(await sincronizarCitaEnGoogle(cliente, { userId: 'u1', tallerId: 't1', cita: CITA })).toBe('creado')
    expect(vi.mocked(createCalendarEvent).mock.calls[0][0]).toBe('nuevo')
    expect(escrituras[0]).toMatchObject({ tabla: 'google_calendar_tokens', op: 'update', filtro: { user_id: 'u1' }, datos: { access_token: 'nuevo' } })
  })

  it('caducado y sin refresh_token: como si no estuviera conectado', async () => {
    const { cliente } = falsoSupabase({ google_calendar_tokens: [{ user_id: 'u1', access_token: 'viejo', expiry_date: Date.now() - 1 }] })
    expect(await sincronizarCitaEnGoogle(cliente, { userId: 'u1', tallerId: 't1', cita: CITA })).toBe('sin-google')
    expect(createCalendarEvent).not.toHaveBeenCalled()
  })

  it('Google falla: devuelve "error", no lanza y no guarda referencia', async () => {
    const { cliente, escrituras } = falsoSupabase({ google_calendar_tokens: [{ user_id: 'u1', access_token: 'tok', expiry_date: EN_UNA_HORA }] })
    vi.mocked(createCalendarEvent).mockRejectedValue(new Error('Rate Limit Exceeded'))
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await sincronizarCitaEnGoogle(cliente, { userId: 'u1', tallerId: 't1', cita: CITA })).toBe('error')
    expect(escrituras).toEqual([])
    // El log no incluye el token
    expect(JSON.stringify(espia.mock.calls)).not.toContain('tok')
    espia.mockRestore()
  })
})

describe('borrarCitaDeGoogle', () => {
  it('sin evento sincronizado no hace nada (ni pide token)', async () => {
    const { cliente } = falsoSupabase({ google_calendar_tokens: [{ user_id: 'u1', access_token: 'tok', expiry_date: EN_UNA_HORA }] })
    expect(await borrarCitaDeGoogle(cliente, { userId: 'u1', citaId: 'cita-1' })).toBe('sin-evento')
    expect(deleteCalendarEvent).not.toHaveBeenCalled()
  })

  it('borra el evento y su referencia', async () => {
    const { cliente, escrituras } = falsoSupabase({
      google_calendar_tokens: [{ user_id: 'u1', access_token: 'tok', expiry_date: EN_UNA_HORA }],
      google_calendar_events: [{ id: 'ref-1', user_id: 'u1', tipo_referencia: 'cita', referencia_id: 'cita-1', google_event_id: 'g-1', calendar_id: 'otro' }],
    })
    expect(await borrarCitaDeGoogle(cliente, { userId: 'u1', citaId: 'cita-1' })).toBe('borrado')
    expect(deleteCalendarEvent).toHaveBeenCalledWith('tok', 'g-1', 'otro')
    expect(escrituras).toEqual([{ tabla: 'google_calendar_events', op: 'delete', datos: undefined, filtro: { id: 'ref-1' } }])
  })

  it('si Google falla, la referencia se conserva para reintentar', async () => {
    const { cliente, escrituras } = falsoSupabase({
      google_calendar_tokens: [{ user_id: 'u1', access_token: 'tok', expiry_date: EN_UNA_HORA }],
      google_calendar_events: [{ id: 'ref-1', user_id: 'u1', tipo_referencia: 'cita', referencia_id: 'cita-1', google_event_id: 'g-1' }],
    })
    vi.mocked(deleteCalendarEvent).mockRejectedValue(new Error('Backend Error'))
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await borrarCitaDeGoogle(cliente, { userId: 'u1', citaId: 'cita-1' })).toBe('error')
    expect(escrituras).toEqual([])
    espia.mockRestore()
  })
})
