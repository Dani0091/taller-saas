/**
 * @fileoverview Citas en el Google Calendar del taller
 * @description Al crear, editar o borrar una cita se refleja en el Google
 * Calendar del usuario que la guarda, si lo tiene conectado.
 *
 * - Best-effort: nunca lanza. Sin Google conectado no hace nada; un fallo de
 *   Google se registra y la cita queda guardada igual.
 * - Tokens y eventos son por usuario (RLS: user_id = auth.uid()), así que cada
 *   usuario solo ve y toca los eventos de su propio calendario.
 * - La referencia cita → evento vive en google_calendar_events
 *   (tipo_referencia 'cita'), igual que en las órdenes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  refreshAccessToken,
  isTokenExpired,
  type GoogleCalendarEvent,
} from './calendar'
import { rangoCita, isoDia } from '@/lib/calendar/export'

const ZONA = 'Europe/Madrid'

export interface CitaParaGoogle {
  id: string
  titulo: string
  descripcion?: string | null
  fecha_inicio: string
  fecha_fin?: string | null
  todo_el_dia?: boolean | null
  estado?: string | null
  cliente?: { nombre?: string | null; apellidos?: string | null; telefono?: string | null } | null
  vehiculo?: { matricula?: string | null; marca?: string | null; modelo?: string | null } | null
}

export type ResultadoSync = 'sin-google' | 'sin-evento' | 'creado' | 'actualizado' | 'borrado' | 'error'

const unir = (partes: Array<string | null | undefined>, sep = ' ') => partes.filter(Boolean).join(sep)

/** Evento de Google a partir de una cita. Puro: sin red ni base de datos. */
export function eventoGoogleDeCita(cita: CitaParaGoogle, ubicacion?: string | null): GoogleCalendarEvent {
  const r = rangoCita(cita)
  const cliente = cita.cliente ? unir([cita.cliente.nombre, cita.cliente.apellidos]) : ''
  const vehiculo = cita.vehiculo ? unir([cita.vehiculo.marca, cita.vehiculo.modelo, cita.vehiculo.matricula]) : ''
  const cancelada = cita.estado === 'cancelada'

  const descripcion = unir([
    cita.descripcion,
    cliente && `Cliente: ${unir([cliente, cita.cliente?.telefono && `(${cita.cliente.telefono})`])}`,
    vehiculo && `Vehículo: ${vehiculo}`,
  ], '\n')

  return {
    summary: unir([cancelada ? 'CANCELADA ·' : null, cita.titulo, cliente && `· ${cliente}`]),
    description: descripcion || undefined,
    start: cita.todo_el_dia ? { date: isoDia(r.primerDia) } : { dateTime: r.inicio.toISOString(), timeZone: ZONA },
    end: cita.todo_el_dia ? { date: isoDia(r.diaTrasUltimo) } : { dateTime: r.fin.toISOString(), timeZone: ZONA },
    location: ubicacion || undefined,
    reminders: { useDefault: true },
  }
}

/** Token válido del usuario, refrescándolo si ha caducado. null si no tiene Google conectado. */
async function tokenDeGoogle(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: token } = await supabase
    .from('google_calendar_tokens')
    .select('access_token, refresh_token, expiry_date')
    .eq('user_id', userId)
    .maybeSingle()

  if (!token?.access_token) return null
  if (!isTokenExpired(token.expiry_date)) return token.access_token
  if (!token.refresh_token) return null

  const nuevos = await refreshAccessToken(token.refresh_token)
  await supabase
    .from('google_calendar_tokens')
    .update({
      access_token: nuevos.access_token,
      expiry_date: nuevos.expires_in ? Date.now() + nuevos.expires_in * 1000 : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
  return nuevos.access_token
}

async function referencia(supabase: SupabaseClient, userId: string, citaId: string) {
  const { data } = await supabase
    .from('google_calendar_events')
    .select('id, google_event_id, calendar_id')
    .eq('tipo_referencia', 'cita')
    .eq('referencia_id', citaId)
    .eq('user_id', userId)
    .maybeSingle()
  return data as { id: string; google_event_id: string; calendar_id: string | null } | null
}

/** Crea o actualiza el evento de la cita en el Google Calendar del usuario. */
export async function sincronizarCitaEnGoogle(
  supabase: SupabaseClient,
  opts: { userId: string; tallerId: string; cita: CitaParaGoogle; ubicacion?: string | null }
): Promise<ResultadoSync> {
  try {
    const token = await tokenDeGoogle(supabase, opts.userId)
    if (!token) return 'sin-google'

    // Dirección del taller como ubicación (solo se consulta con Google conectado)
    let ubicacion = opts.ubicacion
    if (ubicacion === undefined) {
      const { data: cfg } = await supabase.from('taller_config').select('direccion').eq('taller_id', opts.tallerId).maybeSingle()
      ubicacion = (cfg as { direccion?: string | null } | null)?.direccion ?? null
    }

    const evento = eventoGoogleDeCita(opts.cita, ubicacion)
    const ref = await referencia(supabase, opts.userId, opts.cita.id)

    if (ref) {
      await updateCalendarEvent(token, ref.google_event_id, evento, ref.calendar_id || 'primary')
      await supabase.from('google_calendar_events').update({ sincronizado_at: new Date().toISOString() }).eq('id', ref.id)
      return 'actualizado'
    }

    const creado = await createCalendarEvent(token, evento, 'primary')
    await supabase.from('google_calendar_events').insert({
      user_id: opts.userId,
      taller_id: opts.tallerId,
      tipo_referencia: 'cita',
      referencia_id: opts.cita.id,
      google_event_id: creado.id,
      calendar_id: 'primary',
      google_event_link: creado.htmlLink,
    })
    return 'creado'
  } catch (error) {
    console.error('[Google Calendar] No se pudo sincronizar la cita', opts.cita.id, error instanceof Error ? error.message : error)
    return 'error'
  }
}

/** Borra el evento de la cita del Google Calendar del usuario (y su referencia). */
export async function borrarCitaDeGoogle(
  supabase: SupabaseClient,
  opts: { userId: string; citaId: string }
): Promise<ResultadoSync> {
  try {
    const ref = await referencia(supabase, opts.userId, opts.citaId)
    if (!ref) return 'sin-evento'

    const token = await tokenDeGoogle(supabase, opts.userId)
    if (!token) return 'sin-google'

    await deleteCalendarEvent(token, ref.google_event_id, ref.calendar_id || 'primary')
    await supabase.from('google_calendar_events').delete().eq('id', ref.id)
    return 'borrado'
  } catch (error) {
    console.error('[Google Calendar] No se pudo borrar la cita', opts.citaId, error instanceof Error ? error.message : error)
    return 'error'
  }
}
