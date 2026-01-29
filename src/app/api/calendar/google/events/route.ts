import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createCalendarEvent,
  refreshAccessToken,
  isTokenExpired,
  formatForGoogleCalendar,
} from '@/lib/google/calendar'

interface CreateEventRequest {
  titulo: string
  descripcion?: string
  fecha_inicio: string
  fecha_fin?: string
  todo_el_dia?: boolean
  ubicacion?: string
  tipo_referencia: 'orden' | 'cita'
  referencia_id: string
}

/**
 * POST /api/calendar/google/events
 * Crea un evento en Google Calendar
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener usuario
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, taller_id')
      .eq('auth_id', user.id)
      .single()

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Obtener tokens de Google
    const { data: tokenData } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('usuario_id', usuario.id)
      .single()

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Google Calendar no está conectado' },
        { status: 400 }
      )
    }

    let accessToken = tokenData.access_token

    // Refrescar token si está expirado
    if (isTokenExpired(tokenData.expires_at) && tokenData.refresh_token) {
      try {
        const newTokens = await refreshAccessToken(tokenData.refresh_token)
        accessToken = newTokens.access_token

        // Actualizar tokens en BD
        const expiresAt = newTokens.expires_in
          ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
          : null

        await supabase
          .from('google_calendar_tokens')
          .update({
            access_token: newTokens.access_token,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('usuario_id', usuario.id)
      } catch (refreshError) {
        console.error('Error refrescando token:', refreshError)
        return NextResponse.json(
          { error: 'Sesión de Google expirada. Por favor reconecta tu cuenta.' },
          { status: 401 }
        )
      }
    }

    // Parsear body
    const body: CreateEventRequest = await req.json()

    if (!body.titulo || !body.fecha_inicio || !body.tipo_referencia || !body.referencia_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un evento para esta referencia
    const { data: eventoExistente } = await supabase
      .from('google_calendar_events')
      .select('google_event_id')
      .eq('tipo_referencia', body.tipo_referencia)
      .eq('referencia_id', body.referencia_id)
      .eq('usuario_id', usuario.id)
      .single()

    if (eventoExistente) {
      return NextResponse.json(
        { error: 'Ya existe un evento en el calendario para esta orden/cita', existing: true },
        { status: 409 }
      )
    }

    // Crear evento en Google Calendar
    const fechaInicio = new Date(body.fecha_inicio)
    const fechaFin = body.fecha_fin
      ? new Date(body.fecha_fin)
      : new Date(fechaInicio.getTime() + 60 * 60 * 1000) // +1 hora por defecto

    const googleEvent = {
      summary: body.titulo,
      description: body.descripcion || '',
      start: formatForGoogleCalendar(fechaInicio, body.todo_el_dia),
      end: formatForGoogleCalendar(fechaFin, body.todo_el_dia),
      location: body.ubicacion || '',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 }, // 1 hora antes
          { method: 'popup', minutes: 1440 }, // 1 día antes
        ],
      },
    }

    const createdEvent = await createCalendarEvent(
      accessToken,
      googleEvent,
      tokenData.calendar_id || 'primary'
    )

    // Guardar referencia del evento en BD
    await supabase.from('google_calendar_events').insert({
      usuario_id: usuario.id,
      taller_id: usuario.taller_id,
      tipo_referencia: body.tipo_referencia,
      referencia_id: body.referencia_id,
      google_event_id: createdEvent.id,
      calendar_id: tokenData.calendar_id || 'primary',
      google_event_link: createdEvent.htmlLink,
    })

    return NextResponse.json({
      success: true,
      event_id: createdEvent.id,
      event_link: createdEvent.htmlLink,
    })
  } catch (error: any) {
    console.error('Error creando evento:', error)
    return NextResponse.json(
      { error: error.message || 'Error creando evento' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/calendar/google/events?tipo=orden&id=xxx
 * Obtiene el estado del evento sincronizado
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const tipo = searchParams.get('tipo')
    const id = searchParams.get('id')

    if (!tipo || !id) {
      return NextResponse.json(
        { error: 'Parámetros requeridos: tipo, id' },
        { status: 400 }
      )
    }

    // Obtener usuario
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Buscar evento
    const { data: evento } = await supabase
      .from('google_calendar_events')
      .select('*')
      .eq('tipo_referencia', tipo)
      .eq('referencia_id', id)
      .eq('usuario_id', usuario.id)
      .single()

    if (!evento) {
      return NextResponse.json({
        synced: false,
      })
    }

    return NextResponse.json({
      synced: true,
      google_event_id: evento.google_event_id,
      google_event_link: evento.google_event_link,
      synced_at: evento.sincronizado_at,
    })
  } catch (error: any) {
    console.error('Error obteniendo evento:', error)
    return NextResponse.json(
      { error: error.message || 'Error obteniendo evento' },
      { status: 500 }
    )
  }
}
