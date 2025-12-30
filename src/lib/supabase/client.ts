import { createBrowserClient } from '@supabase/ssr'

/**
 * CLIENTE SUPABASE - LADO CLIENTE (navegador)
 *
 * Este cliente se usa en:
 * - Componentes Client ('use client')
 * - Llamadas desde el navegador
 * - Acciones del usuario en tiempo real
 *
 * ⚠️ NUNCA exponga SUPABASE_SERVICE_ROLE_KEY aquí
 * Solo use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 */

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
