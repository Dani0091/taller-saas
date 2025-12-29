import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function PUT(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      )
    }

    const datosActualizar: any = {
      updated_at: new Date().toISOString(),
    }

    // Actualizar solo los campos que se envíen
    if (body.nombre !== undefined) datosActualizar.nombre = body.nombre
    if (body.apellidos !== undefined) datosActualizar.apellidos = body.apellidos
    if (body.nif !== undefined) datosActualizar.nif = body.nif
    if (body.email !== undefined) datosActualizar.email = body.email
    if (body.telefono !== undefined) datosActualizar.telefono = body.telefono
    if (body.direccion !== undefined) datosActualizar.direccion = body.direccion
    if (body.tipo_cliente !== undefined) datosActualizar.tipo_cliente = body.tipo_cliente
    if (body.estado !== undefined) datosActualizar.estado = body.estado
    if (body.notas !== undefined) datosActualizar.notas = body.notas

    const { data, error } = await supabase
      .from('clientes')
      .update(datosActualizar)
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
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
