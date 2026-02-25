import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const taller_id = searchParams.get('taller_id')

    if (!taller_id) {
      return NextResponse.json(
        { error: 'taller_id es requerido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // ✅ Consultar desde taller_config
    const { data, error } = await supabase
      .from('taller_config')
      .select('*')
      .eq('taller_id', taller_id)
      .single()

    if (error) {
      // Si no existe, retornar config por defecto
      return NextResponse.json({
        id: null,
        taller_id,
        tarifa_hora: 45.00,
        incluye_iva: true,
        porcentaje_iva: 21.00,
        nombre_empresa: null,
        cif: null,
        direccion: null,
        telefono: null,
        email: null,
        logo_url: null,
        serie_factura: null,
      })
    }

    // taller_config ya tiene la columna serie_factura directamente
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error en servidor' },
      { status: 500 }
    )
  }
}
