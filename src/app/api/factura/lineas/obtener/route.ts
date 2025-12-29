import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orden_id = searchParams.get('orden_id')

    if (!orden_id) {
      return NextResponse.json(
        { error: 'orden_id es requerido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('factura_lineas')
      .select('*')
      .eq('orden_id', orden_id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error en servidor' },
      { status: 500 }
    )
  }
}
