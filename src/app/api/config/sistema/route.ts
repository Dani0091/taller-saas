/**
 * API ENDPOINT: Configuración del Sistema de Pánico
 *
 * Devuelve los valores de app_config que controlan el estado del sistema:
 *   - maintenance_mode: si 'true', la app muestra pantalla de mantenimiento
 *   - min_version:      versión mínima requerida del cliente
 *   - stable_version:   versión estable a la que hacer rollback si hay error
 *
 * IMPORTANTE: Este endpoint NO requiere autenticación porque debe
 * poder responder antes de que el usuario inicie sesión (para mostrar
 * el modo mantenimiento incluso a usuarios sin sesión activa).
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const CLAVES_SISTEMA = ['maintenance_mode', 'min_version', 'stable_version'] as const

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      // Si no hay variables de entorno, devolvemos un estado seguro (no bloquear)
      return NextResponse.json({
        maintenance_mode: false,
        min_version: '1.1.0',
        stable_version: '1.1.0',
        source: 'fallback'
      })
    }

    // Cliente sin cookies — lectura pública de app_config
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: { get: () => undefined, set: () => {}, remove: () => {} }
    })

    const { data, error } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', CLAVES_SISTEMA)

    if (error || !data) {
      // Error de BD: modo seguro, no bloquear la app
      console.error('[sistema] Error leyendo app_config:', error?.message)
      return NextResponse.json({
        maintenance_mode: false,
        min_version: '1.1.0',
        stable_version: '1.1.0',
        source: 'fallback_db_error'
      })
    }

    // Reducir array a objeto clave→valor
    const config = data.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value ?? ''
      return acc
    }, {})

    return NextResponse.json({
      maintenance_mode: config['maintenance_mode'] === 'true',
      min_version:      config['min_version']      ?? '1.1.0',
      stable_version:   config['stable_version']   ?? '1.1.0',
      source: 'db'
    })

  } catch (err: any) {
    console.error('[sistema] Error inesperado:', err?.message)
    return NextResponse.json({
      maintenance_mode: false,
      min_version: '1.1.0',
      stable_version: '1.1.0',
      source: 'fallback_exception'
    })
  }
}
