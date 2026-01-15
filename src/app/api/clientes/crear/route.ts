import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const {
      taller_id,
      nombre,
      apellidos, // Campo legacy
      primer_apellido,
      segundo_apellido,
      nif,
      email,
      telefono,
      direccion,
      ciudad,
      provincia,
      codigo_postal,
      pais = 'ES',
      tipo_cliente = 'particular',
      contacto_principal,
      contacto_email,
      contacto_telefono,
      notas,
      iban,
      forma_pago,
    } = body

    if (!taller_id || !nombre) {
      return NextResponse.json(
        { error: 'taller_id y nombre son requeridos' },
        { status: 400 }
      )
    }

    // Construir apellidos: priorizar campos separados, luego campo legacy
    let apellidosFinal = apellidos
    if (primer_apellido || segundo_apellido) {
      apellidosFinal = [primer_apellido, segundo_apellido].filter(Boolean).join(' ').trim()
    }

    const { data, error } = await supabase
      .from('clientes')
      .insert([
        {
          taller_id,
          nombre,
          apellidos: apellidosFinal || null,
          nif,
          email,
          telefono,
          direccion,
          ciudad,
          provincia,
          codigo_postal,
          pais,
          tipo_cliente,
          contacto_principal,
          contacto_email,
          contacto_telefono,
          notas,
          iban,
          forma_pago,
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
