/**
 * API ENDPOINT: Obtener Series de Facturación
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'

export async function GET() {
  try {
    const supabase = await createClient()

    // Sesión obligatoria; el taller sale de la sesión (el parámetro ?taller_id se ignora).
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)
    const taller_id = auth.tallerId

    // Obtener series del taller
    const { data: series, error } = await supabase
      .from('series_factura')
      .select('*')
      .eq('taller_id', taller_id)
      .order('nombre', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: 'Error al obtener series', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ series: series || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error interno', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
