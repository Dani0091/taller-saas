import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: clientes, error } = await supabaseAdmin
      .from('clientes')
      .select('*')
      .order('nombre')

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      clientes: clientes || [] 
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, nif, telefono, email, direccion, taller_id } = body

    if (!nombre || !nif) {
      return NextResponse.json(
        { success: false, error: 'Nombre y NIF requeridos' },
        { status: 400 }
      )
    }

    const { data: cliente, error } = await supabaseAdmin
      .from('clientes')
      .insert([{ nombre, nif, telefono, email, direccion, taller_id }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      cliente 
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
