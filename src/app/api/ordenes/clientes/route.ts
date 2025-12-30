import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const tallerId = request.nextUrl.searchParams.get('taller_id')

    let query = supabase
      .from('clientes')
      .select('*')
      .eq('estado', 'activo')
      .order('nombre')

    if (tallerId) {
      query = query.eq('taller_id', tallerId)
    }

    const { data: clientes, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      clientes: clientes || []
    })
  } catch (error: unknown) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { nombre, nif, telefono, email, direccion, taller_id } = body

    if (!nombre || !nif) {
      return NextResponse.json(
        { success: false, error: 'Nombre y NIF requeridos' },
        { status: 400 }
      )
    }

    const { data: cliente, error } = await supabase
      .from('clientes')
      .insert([{ nombre, nif, telefono, email, direccion, taller_id, estado: 'activo' }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      cliente
    })
  } catch (error: unknown) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
