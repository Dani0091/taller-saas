import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const id = request.nextUrl.searchParams.get('id')
    const tallerId = request.nextUrl.searchParams.get('taller_id')

    if (id) {
      // Obtener cliente específico por ID
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, cliente: data })
    }

    if (!tallerId) {
      return NextResponse.json([], { status: 200 })
    }

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('taller_id', tallerId)
      .eq('estado', 'activo')
      .order('nombre')

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json([], { status: 200 })
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error) {
    console.error('Catch error:', error)
    return NextResponse.json([], { status: 200 })
  }
}
