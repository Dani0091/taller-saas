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
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'

export async function PUT(request: NextRequest) {
  try {
    // Validar autenticación
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) {
      return authErrorResponse(auth)
    }

    const supabase = await createClient()
    const id = request.nextUrl.searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      )
    }

    // Obtener estado actual para validar inmutabilidad (normativa fiscal española)
    const { data: facturaActual } = await supabase
      .from('facturas')
      .select('estado')
      .eq('id', id)
      .eq('taller_id', auth.tallerId)
      .single()

    if (!facturaActual) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    const estadoActual = facturaActual.estado

    if (estadoActual === 'pagada' || estadoActual === 'anulada') {
      return NextResponse.json(
        { error: `Las facturas ${estadoActual === 'pagada' ? 'pagadas' : 'anuladas'} son inmutables. Emite una factura rectificativa.` },
        { status: 403 }
      )
    }

    if (estadoActual === 'emitida') {
      // Solo se permite marcar como pagada y actualizar método de pago
      if (body.estado && body.estado !== 'pagada') {
        return NextResponse.json(
          { error: 'Una factura emitida solo puede pasar a estado "pagada".' },
          { status: 403 }
        )
      }
      const camposNoPermitidos = Object.keys(body).filter(k => !['estado', 'metodo_pago'].includes(k) && body[k] !== undefined)
      if (camposNoPermitidos.length > 0) {
        return NextResponse.json(
          { error: 'Las facturas emitidas son inmutables. Solo se puede actualizar el estado y el método de pago.' },
          { status: 403 }
        )
      }
    }

    // Campos válidos que existen en la base de datos
    const camposValidos = estadoActual === 'emitida'
      ? ['estado', 'metodo_pago']
      : ['estado', 'metodo_pago', 'notas', 'fecha_vencimiento', 'condiciones_pago']
    const datosActualizar: Record<string, any> = {}

    for (const campo of camposValidos) {
      if (body[campo] !== undefined) {
        datosActualizar[campo] = body[campo]
      }
    }

    datosActualizar.updated_at = new Date().toISOString()

    // Actualizar factura solo si pertenece al taller del usuario
    const { data, error } = await supabase
      .from('facturas')
      .update(datosActualizar)
      .eq('id', id)
      .eq('taller_id', auth.tallerId)
      .select()

    if (error) {
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
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
