import { createBrowserClient } from '@supabase/ssr'

/**
 * CLIENTE SUPABASE - LADO CLIENTE
 *
 * Este cliente se usa en:
 * - Client Components ('use client')
 *
 * Durante el prerendering/build, las variables de entorno pueden no estar disponibles.
 * Usamos valores fallback vacíos que serán reemplazados en runtime.
 */

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  // Durante prerendering en build, las env vars pueden no estar disponibles
  // Retornamos un cliente mock que no fallará pero no funcionará realmente
  if (!supabaseUrl || !supabaseAnonKey) {
    // Retornar un cliente con URL y key placeholders para evitar errores en build
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
