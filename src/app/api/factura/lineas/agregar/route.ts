import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orden_id, tipo, descripcion, cantidad, precio_unitario } = body

    if (!orden_id || !tipo || !descripcion || !cantidad || !precio_unitario) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const subtotal = parseFloat(cantidad) * parseFloat(precio_unitario)

    const { data, error } = await supabase
      .from('factura_lineas')
      .insert([{
        orden_id,
        tipo,
        descripcion,
        cantidad: parseFloat(cantidad),
        precio_unitario: parseFloat(precio_unitario),
        subtotal,
      }])
      .select()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data?.[0], { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error al agregar línea' },
      { status: 500 }
    )
  }
}
