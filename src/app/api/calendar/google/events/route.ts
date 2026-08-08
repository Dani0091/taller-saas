import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createCalendarEvent,
  updateCalendarEvent,
  refreshAccessToken,
  isTokenExpired,
  formatForGoogleCalendar,
} from '@/lib/google/calendar'
import { ESTADOS_ORDEN } from '@/lib/constants'

/**
 * Sincroniza (actualiza) el evento de Google Calendar de una orden, si existe.
 * Best-effort: si la orden no tiene evento sincronizado, o el usuario dueño del
 * evento no tiene Google Calendar conectado, no hace nada y no lanza error —
 * la sincronización con Calendar nunca debe bloquear el flujo principal (guardar
 * orden, aprobar presupuesto, emitir factura).
 *
 * Acepta un cliente Supabase inyectado para poder llamarse tanto desde rutas
 * autenticadas (cliente con sesión de usuario) como desde la ruta pública de
 * aprobación de presupuesto (cliente admin, sin sesión de usuario).
 *
 * NOTA: tanto google_calendar_tokens como google_calendar_events usan
 * user_id = auth.users(id) directamente (no el id interno de la tabla `usuarios`) —
 * así lo exige la política RLS de ambas tablas.
 */
export async function syncOrdenCalendarEvent(
  supabase: any,
  ordenId: string,
  opts?: { notaExtra?: string }
): Promise<void> {
  try {
    const { data: eventoRef } = await supabase
      .from('google_calendar_events')
      .select('user_id, google_event_id, calendar_id')
      .eq('tipo_referencia', 'orden')
      .eq('referencia_id', ordenId)
      .maybeSingle()

    if (!eventoRef) return // Sin evento sincronizado para esta orden — nada que actualizar

    const { data: tokenData } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', eventoRef.user_id)
      .maybeSingle()

    if (!tokenData) return

    let accessToken = tokenData.access_token
    if (isTokenExpired(tokenData.expiry_date) && tokenData.refresh_token) {
      const newTokens = await refreshAccessToken(tokenData.refresh_token)
      accessToken = newTokens.access_token
      const expiryDate = newTokens.expires_in ? Date.now() + newTokens.expires_in * 1000 : null

      await supabase
        .from('google_calendar_tokens')
        .update({ access_token: newTokens.access_token, expiry_date: expiryDate, updated_at: new Date().toISOString() })
        .eq('user_id', eventoRef.user_id)
    }

    const { data: orden } = await supabase
      .from('ordenes_reparacion')
      .select('numero_orden, estado, clientes(nombre, apellidos)')
      .eq('id', ordenId)
      .single()

    if (!orden) return

    const estadoInfo = ESTADOS_ORDEN.find(e => e.value === orden.estado)
    const clienteNombre = orden.clientes
      ? `${orden.clientes.nombre} ${orden.clientes.apellidos || ''}`.trim()
      : ''
    const titulo = `🔧 ${orden.numero_orden}: ${clienteNombre}${estadoInfo ? ` — ${estadoInfo.label}` : ''}`
    const descripcion = [estadoInfo?.description, opts?.notaExtra].filter(Boolean).join('\n')

    await updateCalendarEvent(
      accessToken,
      eventoRef.google_event_id,
      {
        summary: titulo,
        description: descripcion || undefined,
        colorId: estadoInfo?.googleColorId,
      },
      eventoRef.calendar_id || 'primary'
    )
  } catch (error) {
    console.error('Error sincronizando evento de calendario para orden', ordenId, error)
    // No relanzar — best-effort, nunca debe romper el flujo que la llamó
  }
}

/**
 * PATCH /api/calendar/google/events
 * Sincroniza el evento de calendario de una orden tras un cambio de estado.
 * Silencioso si la orden no tiene evento sincronizado (no todos los usuarios conectan Calendar).
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { orden_id, nota_extra } = body

    if (!orden_id) {
      return NextResponse.json({ error: 'orden_id requerido' }, { status: 400 })
    }

    await syncOrdenCalendarEvent(supabase, orden_id, { notaExtra: nota_extra })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error en PATCH events:', error)
    return NextResponse.json({ error: error.message || 'Error actualizando evento' }, { status: 500 })
  }
}

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

    // Obtener usuario (para taller_id, solo con fines informativos en google_calendar_events)
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
      .eq('user_id', user.id)
      .single()

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Google Calendar no está conectado' },
        { status: 400 }
      )
    }

    let accessToken = tokenData.access_token

    // Refrescar token si está expirado
    if (isTokenExpired(tokenData.expiry_date) && tokenData.refresh_token) {
      try {
        const newTokens = await refreshAccessToken(tokenData.refresh_token)
        accessToken = newTokens.access_token

        // Actualizar tokens en BD
        const expiryDate = newTokens.expires_in ? Date.now() + newTokens.expires_in * 1000 : null

        await supabase
          .from('google_calendar_tokens')
          .update({
            access_token: newTokens.access_token,
            expiry_date: expiryDate,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
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
      .eq('user_id', user.id)
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

    const createdEvent = await createCalendarEvent(accessToken, googleEvent, 'primary')

    // Guardar referencia del evento en BD
    await supabase.from('google_calendar_events').insert({
      user_id: user.id,
      taller_id: usuario.taller_id,
      tipo_referencia: body.tipo_referencia,
      referencia_id: body.referencia_id,
      google_event_id: createdEvent.id,
      calendar_id: 'primary',
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

    // Buscar evento
    const { data: evento } = await supabase
      .from('google_calendar_events')
      .select('*')
      .eq('tipo_referencia', tipo)
      .eq('referencia_id', id)
      .eq('user_id', user.id)
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
