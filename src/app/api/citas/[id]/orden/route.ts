/**
 * API ROUTE: ORDEN DE TRABAJO DESDE UNA CITA
 *
 * POST /api/citas/[id]/orden - Crea la orden con el cliente y vehículo de la
 * cita y la enlaza (citas.orden_id). Si la cita ya tiene orden, la devuelve:
 * pulsar dos veces no crea dos órdenes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'
import { insertarOrdenNumerada } from '@/lib/ordenes/ficha-servidor'
import { validarVinculosTaller } from '@/lib/ordenes/validar-orden'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await getAuthenticatedUser()
    if (isAuthError(authResult)) {
      return authErrorResponse(authResult)
    }
    const { tallerId } = authResult
    const supabase = await createClient()

    const { data: cita } = await supabase
      .from('citas')
      .select('id, titulo, descripcion, cliente_id, vehiculo_id, orden_id')
      .eq('id', id)
      .eq('taller_id', tallerId)
      .maybeSingle()

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    if (cita.orden_id) {
      const { data: existente } = await supabase
        .from('ordenes_reparacion')
        .select('id, numero_orden')
        .eq('id', cita.orden_id)
        .eq('taller_id', tallerId)
        .maybeSingle()
      if (existente) {
        return NextResponse.json({ orden: existente, creada: false })
      }
    }

    if (!cita.cliente_id || !cita.vehiculo_id) {
      return NextResponse.json(
        { error: 'Para crear la orden, la cita necesita cliente y vehículo' },
        { status: 400 }
      )
    }

    const errorVinculo = await validarVinculosTaller(supabase, tallerId, { cliente_id: cita.cliente_id, vehiculo_id: cita.vehiculo_id })
    if (errorVinculo) {
      return NextResponse.json({ error: errorVinculo }, { status: 400 })
    }

    const descripcion = [cita.titulo, cita.descripcion].filter(Boolean).join('. ')

    // Número OR-NNNN como el asistente; si ya existe, el siguiente
    const orden = await insertarOrdenNumerada(supabase, tallerId, {
      cliente_id: cita.cliente_id,
      vehiculo_id: cita.vehiculo_id,
      estado: 'recibido',
      descripcion_problema: descripcion || null,
    })

    if (!orden) {
      return NextResponse.json({ error: 'No se pudo asignar número de orden; inténtalo de nuevo' }, { status: 409 })
    }

    const { error: errorEnlace } = await supabase
      .from('citas')
      .update({ orden_id: orden.id })
      .eq('id', cita.id)
      .eq('taller_id', tallerId)
    if (errorEnlace) throw errorEnlace

    return NextResponse.json({ orden, creada: true }, { status: 201 })
  } catch (error) {
    console.error('Error creando orden desde cita:', error)
    return NextResponse.json({ error: 'Error al crear la orden' }, { status: 500 })
  }
}
