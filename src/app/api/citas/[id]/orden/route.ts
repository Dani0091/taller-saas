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
import { siguienteNumeroOrden } from '@/lib/ordenes/numero-orden'
import { validarVinculosTaller } from '@/lib/ordenes/validar-orden'

interface RouteParams {
  params: Promise<{ id: string }>
}

const INTENTOS_NUMERO = 5

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

    // Número OR-NNNN a partir de la última orden (como el asistente). Si ya
    // existe (otra orden creada a la vez, o una antigua con ese número), el
    // UNIQUE (taller_id, numero_orden) lo rechaza y se prueba el siguiente.
    const { data: ultima } = await supabase
      .from('ordenes_reparacion')
      .select('numero_orden')
      .eq('taller_id', tallerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let numero = siguienteNumeroOrden(ultima?.numero_orden)
    let orden: { id: string; numero_orden: string } | null = null
    for (let intento = 0; intento < INTENTOS_NUMERO && !orden; intento++) {
      if (intento > 0) numero = siguienteNumeroOrden(numero)
      const { data, error } = await supabase
        .from('ordenes_reparacion')
        .insert({
          taller_id: tallerId,
          numero_orden: numero,
          cliente_id: cita.cliente_id,
          vehiculo_id: cita.vehiculo_id,
          estado: 'recibido',
          descripcion_problema: descripcion || null,
        })
        .select('id, numero_orden')
        .single()

      if (data) orden = data
      else if (error?.code !== '23505') throw error
    }

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
