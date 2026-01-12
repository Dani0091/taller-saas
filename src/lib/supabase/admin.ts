import { createClient } from '@supabase/supabase-js'

/**
 * CLIENTE SUPABASE ADMIN - CON SERVICE ROLE KEY
 *
 * IMPORTANTE: Este cliente BYPASSA RLS
 * Solo usar en el servidor para operaciones administrativas
 * NUNCA exponer la service role key al cliente
 */

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL no está configurada')
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
