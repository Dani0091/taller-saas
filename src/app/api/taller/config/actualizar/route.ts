import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { taller_id, tarifa_hora, incluye_iva, porcentaje_iva, tarifa_con_iva, nombre_empresa, cif, direccion, telefono, email } = body

    if (!taller_id) {
      return NextResponse.json(
        { error: 'taller_id es requerido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('taller_config')
      .select('id')
      .eq('taller_id', taller_id)
      .single()

    let response
    if (existing) {
      response = await supabase
        .from('taller_config')
        .update({
          tarifa_hora,
          incluye_iva,
          porcentaje_iva,
          tarifa_con_iva,
          nombre_empresa,
          cif,
          direccion,
          telefono,
          email,
          updated_at: new Date().toISOString(),
        })
        .eq('taller_id', taller_id)
        .select()
        .single()
    } else {
      response = await supabase
        .from('taller_config')
        .insert([{
          taller_id,
          tarifa_hora,
          incluye_iva,
          porcentaje_iva,
          tarifa_con_iva,
          nombre_empresa,
          cif,
          direccion,
          telefono,
          email,
        }])
        .select()
        .single()
    }

    if (response.error) {
      return NextResponse.json(
        { error: response.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error al guardar configuración' },
      { status: 500 }
    )
  }
}
