/**
 * API ENDPOINT: Actualizar Factura
 * 
 * Permite cambiar:
 * - Estado (borrador → emitida → pagada)
 * - Método de pago
 * - Notas
 * - Condiciones de pago
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const id = request.nextUrl.searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      )
    }

    // Campos válidos que existen en la base de datos
    const camposValidos = ['estado', 'metodo_pago', 'notas', 'fecha_vencimiento']
    const datosActualizar: any = {}

    for (const campo of camposValidos) {
      if (body[campo] !== undefined) {
        datosActualizar[campo] = body[campo]
      }
    }

    datosActualizar.updated_at = new Date().toISOString()

    // Actualizar factura
    const { data, error } = await supabase
      .from('facturas')
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
        { error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      factura: data[0],
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
