import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * CLIENTE SUPABASE - LADO SERVIDOR
 *
 * Este cliente se usa en:
 * - Server Components
 * - Route Handlers (/api/*)
 * - Server Actions
 * - Middleware
 *
 * ✅ Aquí SÍ puedes usar SUPABASE_SERVICE_ROLE_KEY
 * Solo en variables de entorno (nunca expongas en navegador)
 */

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set(name, '', options);
        },
      },
    }
  );
}
