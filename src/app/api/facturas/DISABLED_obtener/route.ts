import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const tallerId = request.nextUrl.searchParams.get('taller_id')
    const estado = request.nextUrl.searchParams.get('estado')

    if (!tallerId) {
      return NextResponse.json(
        { error: 'taller_id es requerido' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('facturas')
      .select('*')
      .eq('taller_id', tallerId)
      .order('fecha_emision', { ascending: false })

    if (estado) {
      query = query.eq('estado', estado)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error Supabase:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
