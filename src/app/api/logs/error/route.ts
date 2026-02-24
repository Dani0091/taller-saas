/**
 * API ENDPOINT: Registro de Fallos Críticos
 *
 * Recibe un error crítico desde el cliente (ErrorBoundary o cualquier
 * try/catch) y lo inserta en logs_sistema_criticos.
 *
 * Diseño:
 *  - No requiere sesión válida (los errores ocurren cuando auth puede fallar)
 *  - Usa el cliente anon para insertar (la policy RLS lo permite)
 *  - Nunca devuelve 5xx para no causar un bucle de error en el cliente
 */

import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Siempre devolvemos 200 para no crear bucle de errores en el cliente
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ logged: false, reason: 'no_env' })
    }

    let body: {
      error_mensaje?: string
      archivo_origen?: string
      usuario_id?: string
      stack_trace?: string
      metadata?: Record<string, unknown>
    } = {}

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ logged: false, reason: 'invalid_json' })
    }

    if (!body.error_mensaje) {
      return NextResponse.json({ logged: false, reason: 'missing_error_mensaje' })
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: { get: () => undefined, set: () => {}, remove: () => {} }
    })

    const { error } = await supabase
      .from('logs_sistema_criticos')
      .insert([{
        error_mensaje:  body.error_mensaje.slice(0, 2000), // límite razonable
        archivo_origen: body.archivo_origen ?? null,
        usuario_id:     body.usuario_id     ?? null,
        stack_trace:    body.stack_trace    ?? null,
        metadata:       body.metadata       ?? null,
      }])

    if (error) {
      // Log en servidor, pero respuesta 200 al cliente para no crear bucle
      console.error('[logs/error] Error insertando en logs_sistema_criticos:', error.message)
      return NextResponse.json({ logged: false, reason: error.message })
    }

    return NextResponse.json({ logged: true })

  } catch (err: any) {
    console.error('[logs/error] Error inesperado:', err?.message)
    return NextResponse.json({ logged: false, reason: 'exception' })
  }
}
