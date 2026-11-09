/**
 * API ROUTE: LÍNEAS DE LA FICHA DE ORDEN
 *
 * POST   /api/ordenes/ficha/lineas - Añade una línea a una orden.
 * PATCH  /api/ordenes/ficha/lineas - Cambia cantidad o precio de una línea.
 * DELETE /api/ordenes/ficha/lineas?id=<id> - Borra una línea.
 *
 * Solo en órdenes del taller de la sesión y no facturadas. Tras cada cambio
 * se recalculan los importes de la orden (el listado muestra el total real).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'
import { leerJson } from '@/lib/api/leer-json'
import { errorLinea, errorImportesLinea, ordenEditable, guardarTotalesOrden } from '@/lib/ordenes/ficha-servidor'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/** La línea y su orden, si la orden es del taller y editable. */
async function lineaEditable(supabase: SupabaseServerClient, tallerId: string, lineaId: unknown) {
  if (typeof lineaId !== 'string' || !lineaId) return { error: 'ID de línea requerido', status: 400 as const }
  const { data: linea } = await supabase
    .from('lineas_orden').select('id, orden_id, cantidad, precio_unitario').eq('id', lineaId).maybeSingle()
  if (!linea) return { error: 'Línea no encontrada', status: 404 as const }
  const editable = await ordenEditable(supabase, tallerId, linea.orden_id)
  if ('error' in editable) return editable
  return { linea }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)
    const body = (await leerJson(request)) as Record<string, unknown> | null

    const error = errorLinea(body)
    if (error) return NextResponse.json({ error }, { status: 400 })
    const supabase = await createClient()
    const editable = await ordenEditable(supabase, auth.tallerId, body?.orden_id)
    if ('error' in editable) return NextResponse.json({ error: editable.error }, { status: editable.status })

    const cantidad = body!.cantidad as number
    const precio = body!.precio_unitario as number
    const { data, error: errorInsert } = await supabase
      .from('lineas_orden')
      .insert({
        orden_id: editable.orden.id,
        tipo: body!.tipo,
        descripcion: body!.descripcion,
        cantidad,
        precio_unitario: precio,
        importe_total: cantidad * precio,
      })
      .select('id')
      .single()
    if (errorInsert || !data) throw errorInsert

    await guardarTotalesOrden(supabase, auth.tallerId, editable.orden.id)
    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (error) {
    console.error('Error añadiendo línea:', error)
    return NextResponse.json({ error: 'Error al añadir la línea' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)
    const body = (await leerJson(request)) as Record<string, unknown> | null
    if (!body) return NextResponse.json({ error: 'Cuerpo de la petición inválido' }, { status: 400 })

    const error = errorImportesLinea(body)
    if (error) return NextResponse.json({ error }, { status: 400 })
    const supabase = await createClient()
    const resultado = await lineaEditable(supabase, auth.tallerId, body.id)
    if ('error' in resultado) return NextResponse.json({ error: resultado.error }, { status: resultado.status })
    const { linea } = resultado

    const cantidad = 'cantidad' in body ? (body.cantidad as number) : Number(linea.cantidad)
    const precio = 'precio_unitario' in body ? (body.precio_unitario as number) : Number(linea.precio_unitario)
    const { error: errorUpd } = await supabase
      .from('lineas_orden')
      .update({ cantidad, precio_unitario: precio, importe_total: cantidad * precio })
      .eq('id', linea.id)
    if (errorUpd) throw errorUpd

    await guardarTotalesOrden(supabase, auth.tallerId, linea.orden_id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error actualizando línea:', error)
    return NextResponse.json({ error: 'Error al guardar el cambio' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)
    const supabase = await createClient()
    const resultado = await lineaEditable(supabase, auth.tallerId, request.nextUrl.searchParams.get('id'))
    if ('error' in resultado) return NextResponse.json({ error: resultado.error }, { status: resultado.status })

    const { error } = await supabase.from('lineas_orden').delete().eq('id', resultado.linea.id)
    if (error) throw error

    await guardarTotalesOrden(supabase, auth.tallerId, resultado.linea.orden_id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error borrando línea:', error)
    return NextResponse.json({ error: 'Error al borrar la línea' }, { status: 500 })
  }
}
