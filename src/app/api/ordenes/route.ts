import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: ordenes, error } = await supabase
      .from('ordenes_reparacion')
      .select(`
        id,
        numero_orden,
        estado,
        cliente_id,
        clientes(nombre, telefono, nif),
        vehiculo_id,
        vehiculos(marca, modelo, matricula),
        fecha_entrada,
        total_con_iva
      `)
      .order('fecha_entrada', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ 
      success: true,
      ordenes: ordenes || [] 
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: orden, error } = await supabase
      .from('ordenes_reparacion')
      .insert([body])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(
      { success: true, orden },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) throw new Error('ID requerido')

    const { data: orden, error } = await supabase
      .from('ordenes_reparacion')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      orden 
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
