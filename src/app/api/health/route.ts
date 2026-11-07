import { NextResponse } from 'next/server'

// Healthcheck de Railway: 200 sin redirecciones ni dependencias externas.
// '/' redirige (307) a /dashboard y Railway solo acepta 2xx.
// El matcher de proxy.ts excluye /api, así que no se llama a Supabase.
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
}
