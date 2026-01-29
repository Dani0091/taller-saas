import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/calendar/google/status
 * Obtiene el estado de conexión de Google Calendar del usuario
 */
export async function GET() {
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
      .select('id')
      .eq('auth_id', session.user.id)
      .single()

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si hay tokens guardados
    const { data: tokens } = await supabase
      .from('google_calendar_tokens')
      .select('google_email, calendar_id, created_at, expires_at')
      .eq('usuario_id', usuario.id)
      .single()

    if (!tokens) {
      return NextResponse.json({
        connected: false,
        configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      })
    }

    return NextResponse.json({
      connected: true,
      configured: true,
      google_email: tokens.google_email,
      calendar_id: tokens.calendar_id,
      connected_at: tokens.created_at,
    })
  } catch (error: any) {
    console.error('Error obteniendo estado:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/calendar/google/status
 * Desconecta Google Calendar (elimina tokens)
 */
export async function DELETE() {
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
      .select('id')
      .eq('auth_id', session.user.id)
      .single()

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Obtener tokens para revocarlos
    const { data: tokens } = await supabase
      .from('google_calendar_tokens')
      .select('access_token, refresh_token')
      .eq('usuario_id', usuario.id)
      .single()

    if (tokens) {
      // Intentar revocar tokens en Google (no crítico si falla)
      try {
        const { revokeToken } = await import('@/lib/google/calendar')
        if (tokens.access_token) {
          await revokeToken(tokens.access_token)
        }
      } catch (e) {
        console.warn('No se pudo revocar token en Google:', e)
      }
    }

    // Eliminar tokens de la BD
    const { error: deleteError } = await supabase
      .from('google_calendar_tokens')
      .delete()
      .eq('usuario_id', usuario.id)

    if (deleteError) {
      throw deleteError
    }

    // También eliminar eventos sincronizados
    await supabase
      .from('google_calendar_events')
      .delete()
      .eq('usuario_id', usuario.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error desconectando:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    )
  }
}
