/**
 * Google Calendar OAuth y API
 * Gestiona la autenticación OAuth y las operaciones con Google Calendar
 */

// Scopes necesarios para Google Calendar
export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

// URLs de OAuth
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}

interface GoogleCalendarEvent {
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  location?: string
  colorId?: string
  reminders?: {
    useDefault: boolean
    overrides?: Array<{ method: string; minutes: number }>
  }
}

/**
 * Genera la URL de autorización de Google
 */
export function getGoogleAuthUrl(redirectUri: string, state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID no configurado')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPES,
    access_type: 'offline',
    prompt: 'consent', // Forzar para obtener refresh_token
    ...(state && { state })
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Intercambia el código de autorización por tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Credenciales de Google no configuradas')
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error intercambiando código:', error)
    throw new Error(error.error_description || 'Error obteniendo tokens')
  }

  return response.json()
}

/**
 * Refresca el access_token usando el refresh_token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Credenciales de Google no configuradas')
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error refrescando token:', error)
    throw new Error(error.error_description || 'Error refrescando token')
  }

  return response.json()
}

/**
 * Obtiene información del usuario de Google
 */
export async function getGoogleUserInfo(accessToken: string): Promise<{ email: string; id: string }> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Error obteniendo información del usuario')
  }

  return response.json()
}

/**
 * Crea un evento en Google Calendar
 */
export async function createCalendarEvent(
  accessToken: string,
  event: GoogleCalendarEvent,
  calendarId: string = 'primary'
): Promise<{ id: string; htmlLink: string }> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    console.error('Error creando evento:', error)
    throw new Error(error.error?.message || 'Error creando evento en calendario')
  }

  const data = await response.json()
  return {
    id: data.id,
    htmlLink: data.htmlLink,
  }
}

/**
 * Elimina un evento de Google Calendar
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok && response.status !== 404) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Error eliminando evento')
  }
}

/**
 * Actualiza un evento en Google Calendar
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>,
  calendarId: string = 'primary'
): Promise<{ id: string; htmlLink: string }> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Error actualizando evento')
  }

  const data = await response.json()
  return {
    id: data.id,
    htmlLink: data.htmlLink,
  }
}

/**
 * Revoca los tokens de acceso
 */
export async function revokeToken(token: string): Promise<void> {
  const response = await fetch(
    `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
    { method: 'POST' }
  )

  // Google puede devolver 200 o 400 si el token ya expiró
  // Ambos casos son aceptables para "desconectar"
}

/**
 * Verifica si el access_token está expirado
 */
export function isTokenExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return true
  const expiry = new Date(expiresAt)
  // Consideramos expirado si queda menos de 5 minutos
  return expiry.getTime() - Date.now() < 5 * 60 * 1000
}

/**
 * Formatea una fecha para Google Calendar
 */
export function formatForGoogleCalendar(
  date: Date | string,
  allDay: boolean = false
): { dateTime?: string; date?: string; timeZone?: string } {
  const d = typeof date === 'string' ? new Date(date) : date

  if (allDay) {
    // Para eventos de todo el día, solo usar fecha YYYY-MM-DD
    return {
      date: d.toISOString().split('T')[0],
    }
  }

  return {
    dateTime: d.toISOString(),
    timeZone: 'Europe/Madrid', // Timezone de España
  }
}
