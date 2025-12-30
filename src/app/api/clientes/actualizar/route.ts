import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // El id viene en el body, no en query params
    const { id, ...datosActualizar } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id es requerido' },
        { status: 400 }
      )
    }

    // Agregar timestamp de actualización
    const updateData = {
      ...datosActualizar,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('clientes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error actualizando cliente:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      cliente: data,
    })
  } catch (error: any) {
    console.error('❌ Error interno:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// También soportar PUT por compatibilidad
export async function PUT(request: NextRequest) {
  return PATCH(request)
}
