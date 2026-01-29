import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
} from '@/lib/google/calendar'

/**
 * GET /api/calendar/google/callback
 * Maneja el callback de OAuth de Google
 * Intercambia el código por tokens y los guarda en la BD
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Si Google devuelve un error
    if (error) {
      console.error('Error de Google OAuth:', error)
      return NextResponse.redirect(
        new URL('/dashboard/configuracion?google_error=denied', req.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/configuracion?google_error=invalid', req.url)
      )
    }

    // Decodificar el state
    let stateData: { userId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/configuracion?google_error=invalid_state', req.url)
      )
    }

    // Verificar que el state no sea muy viejo (15 minutos)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/dashboard/configuracion?google_error=expired', req.url)
      )
    }

    // Verificar sesión
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== stateData.userId) {
      return NextResponse.redirect(
        new URL('/dashboard/configuracion?google_error=unauthorized', req.url)
      )
    }

    // Obtener usuario y taller
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, taller_id')
      .eq('auth_id', user.id)
      .single()

    if (!usuario) {
      return NextResponse.redirect(
        new URL('/dashboard/configuracion?google_error=user_not_found', req.url)
      )
    }

    // Construir la URL de callback (debe coincidir con la usada en authorize)
    const host = req.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirectUri = `${protocol}://${host}/api/calendar/google/callback`

    // Intercambiar código por tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri)

    // Obtener email de Google
    let googleEmail = ''
    try {
      const userInfo = await getGoogleUserInfo(tokens.access_token)
      googleEmail = userInfo.email
    } catch (e) {
      console.warn('No se pudo obtener email de Google:', e)
    }

    // Calcular fecha de expiración
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    // Guardar o actualizar tokens en la BD
    const { error: dbError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        usuario_id: usuario.id,
        taller_id: usuario.taller_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_type: tokens.token_type || 'Bearer',
        expires_at: expiresAt,
        scope: tokens.scope || null,
        google_email: googleEmail,
        calendar_id: 'primary',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'usuario_id'
      })

    if (dbError) {
      console.error('Error guardando tokens:', dbError)
      return NextResponse.redirect(
        new URL('/dashboard/configuracion?google_error=save_failed', req.url)
      )
    }

    // Redirigir a configuración con éxito
    return NextResponse.redirect(
      new URL('/dashboard/configuracion?google_success=connected', req.url)
    )
  } catch (error: any) {
    console.error('Error en callback:', error)
    return NextResponse.redirect(
      new URL('/dashboard/configuracion?google_error=unknown', req.url)
    )
  }
}
