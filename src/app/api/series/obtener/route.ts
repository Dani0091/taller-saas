/**
 * API ENDPOINT: Obtener Series de Facturación
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener taller_id del parámetro
    const { searchParams } = new URL(request.url)
    const taller_id = searchParams.get('taller_id')

    if (!taller_id) {
      return NextResponse.json({ error: 'taller_id es requerido' }, { status: 400 })
    }

    // Obtener series del taller
    const { data: series, error } = await supabase
      .from('series_facturacion')
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
