import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoogleAuthUrl } from '@/lib/google/calendar'

/**
 * GET /api/calendar/google/authorize
 * Inicia el flujo OAuth de Google Calendar
 * Redirige al usuario a la página de consentimiento de Google
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

    // Verificar que tenemos las credenciales de Google
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Google Calendar no está configurado. Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.' },
        { status: 500 }
      )
    }

    // Construir la URL de callback
    const host = req.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirectUri = `${protocol}://${host}/api/calendar/google/callback`

    // El state contiene el ID del usuario para verificar en el callback
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now()
    })).toString('base64')

    // Generar URL de autorización
    const authUrl = getGoogleAuthUrl(redirectUri, state)

    // Redirigir a Google
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('Error en authorize:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    )
  }
}
