/**
 * API ROUTE: FICHA DE ORDEN
 *
 * GET   /api/ordenes/ficha?orden=<id> - Datos para abrir la ficha: configuración
 *       del taller, series, clientes y, si se indica, la orden con sus líneas.
 * POST  /api/ordenes/ficha - Crea la orden (asistente) con sus líneas.
 * PATCH /api/ordenes/ficha - Guarda la orden (autoguardado y «Guardar cambios»).
 *
 * Antes la ficha hacía todo esto desde el navegador contra Supabase. Aquí el
 * taller sale de la sesión, solo se aceptan los campos de la ficha, cliente y
 * vehículo tienen que ser del taller, una orden facturada no se toca y los
 * importes se calculan desde las líneas guardadas.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'
import { leerJson } from '@/lib/api/leer-json'
import { validarVinculosTaller } from '@/lib/ordenes/validar-orden'
import { siguienteNumeroOrden } from '@/lib/ordenes/numero-orden'
import {
  filtrarCamposFicha, errorLinea, errorImportesLinea, ordenEditable,
  guardarTotalesOrden, insertarOrdenNumerada, type LineaEntrada,
} from '@/lib/ordenes/ficha-servidor'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)
    const supabase = await createClient()
    const ordenId = request.nextUrl.searchParams.get('orden')

    const [config, series, clientes] = await Promise.all([
      supabase.from('taller_config').select('tarifa_hora, porcentaje_iva, serie_factura').eq('taller_id', auth.tallerId).maybeSingle(),
      supabase.from('series_factura').select('id, nombre, prefijo, es_predeterminada').eq('taller_id', auth.tallerId).order('nombre'),
      supabase.from('clientes').select('id, nombre, apellidos, nif, telefono').eq('taller_id', auth.tallerId).order('nombre'),
    ])

    let orden = null
    let lineas: unknown[] = []
    let siguienteNumero: string | null = null

    if (ordenId) {
      const { data } = await supabase.from('ordenes_reparacion').select('*').eq('id', ordenId).eq('taller_id', auth.tallerId).maybeSingle()
      if (!data) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
      orden = data
      const { data: lineasData } = await supabase.from('lineas_orden').select('*').eq('orden_id', ordenId).order('created_at')
      lineas = lineasData ?? []
    } else {
      // Número orientativo para la cabecera; el definitivo se asigna al crear
      const { data: ultima } = await supabase
        .from('ordenes_reparacion').select('numero_orden')
        .eq('taller_id', auth.tallerId).like('numero_orden', 'OR-%')
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      siguienteNumero = siguienteNumeroOrden(ultima?.numero_orden)
    }

    return NextResponse.json({
      tallerId: auth.tallerId,
      config: config.data ?? null,
      series: series.data ?? [],
      clientes: clientes.data ?? [],
      orden,
      lineas,
      siguienteNumero,
    })
  } catch (error) {
    console.error('Error cargando la ficha de orden:', error)
    return NextResponse.json({ error: 'Error al cargar la orden' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)
    const body = (await leerJson(request)) as { orden?: unknown; lineas?: unknown } | null

    const campos = filtrarCamposFicha(body?.orden, null)
    if (!campos.ok) return NextResponse.json({ error: campos.error }, { status: 400 })
    if (!campos.datos.cliente_id) return NextResponse.json({ error: 'Selecciona un cliente' }, { status: 400 })

    const lineas = Array.isArray(body?.lineas) ? body.lineas : []
    for (const l of lineas) {
      const error = errorLinea(l)
      if (error) return NextResponse.json({ error }, { status: 400 })
    }

    const supabase = await createClient()
    const errorVinculo = await validarVinculosTaller(supabase, auth.tallerId, campos.datos)
    if (errorVinculo) return NextResponse.json({ error: errorVinculo }, { status: 400 })

    const orden = await insertarOrdenNumerada(supabase, auth.tallerId, campos.datos)
    if (!orden) return NextResponse.json({ error: 'No se pudo asignar número de orden; inténtalo de nuevo' }, { status: 409 })

    if (lineas.length > 0) {
      const { error } = await supabase.from('lineas_orden').insert(
        (lineas as LineaEntrada[]).map((l) => ({
          orden_id: orden.id,
          tipo: l.tipo,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          importe_total: l.cantidad * l.precio_unitario,
        }))
      )
      if (error) console.error('Error guardando líneas de la orden nueva:', error)
    }
    await guardarTotalesOrden(supabase, auth.tallerId, orden.id)

    return NextResponse.json({ orden }, { status: 201 })
  } catch (error) {
    console.error('Error creando la orden:', error)
    return NextResponse.json({ error: 'No se pudo guardar la orden. Inténtalo de nuevo' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)
    const body = (await leerJson(request)) as { id?: unknown; orden?: unknown; lineas?: unknown } | null

    const supabase = await createClient()
    const editable = await ordenEditable(supabase, auth.tallerId, body?.id)
    if ('error' in editable) return NextResponse.json({ error: editable.error }, { status: editable.status })
    const ordenId = editable.orden.id

    const campos = filtrarCamposFicha(body?.orden, editable.orden.estado)
    if (!campos.ok) return NextResponse.json({ error: campos.error }, { status: 400 })
    // Una orden sin cliente impide cargar el listado de órdenes
    if ('cliente_id' in campos.datos && !campos.datos.cliente_id) {
      return NextResponse.json({ error: 'La orden necesita un cliente' }, { status: 400 })
    }

    const errorVinculo = await validarVinculosTaller(supabase, auth.tallerId, campos.datos)
    if (errorVinculo) return NextResponse.json({ error: errorVinculo }, { status: 400 })

    // Cantidades y precios de las líneas de esta orden («Guardar cambios»)
    const lineas = Array.isArray(body?.lineas) ? body.lineas : []
    for (const l of lineas) {
      const linea = (l ?? {}) as Record<string, unknown>
      const error = typeof linea.id !== 'string' ? 'Línea inválida' : errorImportesLinea(linea)
      if (error) return NextResponse.json({ error }, { status: 400 })
    }

    const { error } = await supabase
      .from('ordenes_reparacion')
      .update({ ...campos.datos, updated_at: new Date().toISOString() })
      .eq('id', ordenId)
      .eq('taller_id', auth.tallerId)
      .neq('estado', 'facturado')
    if (error) throw error

    for (const l of lineas as Array<{ id: string; cantidad: number; precio_unitario: number }>) {
      const { error: errorLineaUpd } = await supabase
        .from('lineas_orden')
        .update({ cantidad: l.cantidad, precio_unitario: l.precio_unitario, importe_total: l.cantidad * l.precio_unitario })
        .eq('id', l.id)
        .eq('orden_id', ordenId)
      if (errorLineaUpd) console.error('Error actualizando línea:', l.id, errorLineaUpd)
    }

    await guardarTotalesOrden(supabase, auth.tallerId, ordenId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error guardando la orden:', error)
    return NextResponse.json({ error: 'No se pudo guardar la orden. Inténtalo de nuevo' }, { status: 500 })
  }
}
