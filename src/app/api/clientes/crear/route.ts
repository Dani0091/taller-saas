import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      taller_id,
      nombre,
      apellidos,
      nif,
      email,
      telefono,
      direccion,
      tipo_cliente = 'particular',
      contacto_principal,
      contacto_email,
      contacto_telefono,
      notas,
    } = body

    if (!taller_id || !nombre) {
      return NextResponse.json(
        { error: 'taller_id y nombre son requeridos' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('clientes')
      .insert([
        {
          taller_id,
          nombre,
          apellidos,
          nif,
          email,
          telefono,
          direccion,
          tipo_cliente,
          contacto_principal,
          contacto_email,
          contacto_telefono,
          notas,
          estado: 'activo',
        },
      ])
      .select()

    if (error) {
      console.error('Error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      cliente: data[0],
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
