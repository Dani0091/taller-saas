/**
 * API: Cobro Rápido — Factura Simplificada (Art. 4 Regl. VeriFACTU)
 *
 * Genera, emite y marca como PAGADA una factura en un solo paso.
 * Solo permitido si el importe total < 3.000 € (factura simplificada ES).
 *
 * Flujo: orden → borrador → emitida (número) → pagada
 * Todo en una sola transacción HTTP.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'
import crypto from 'crypto'

const LIMITE_SIMPLIFICADA = 3000

function calcularHuella(params: {
  tallerId: string
  numeroFactura: string
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  clienteId: string
}): string {
  const datos = [
    params.tallerId, params.numeroFactura, params.fechaEmision,
    params.baseImponible.toFixed(2), params.iva.toFixed(2),
    params.total.toFixed(2), params.clienteId,
  ].join('|')
  return crypto.createHash('sha256').update(datos, 'utf8').digest('hex').toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)

    const supabase = await createClient()
    const { orden_id } = await request.json()

    if (!orden_id) {
      return NextResponse.json({ error: 'orden_id es requerido' }, { status: 400 })
    }

    // ── 1. Cargar orden con cliente y líneas ─────────────────────────────────
    const { data: orden, error: ordenError } = await supabase
      .from('ordenes_reparacion')
      .select('*, clientes(*), vehiculos(*)')
      .eq('id', orden_id)
      .eq('taller_id', auth.tallerId)
      .single()

    if (ordenError || !orden) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    if (!orden.cliente_id || !orden.clientes) {
      return NextResponse.json(
        { error: 'La orden debe tener un cliente para generar factura' },
        { status: 400 }
      )
    }

    const estadosValidos = ['aprobado', 'en_progreso', 'finalizado', 'facturado']
    if (!estadosValidos.includes(orden.estado)) {
      return NextResponse.json(
        { error: `El estado "${orden.estado}" no permite facturar. Necesitas: ${estadosValidos.join(', ')}` },
        { status: 400 }
      )
    }

    // ── 2. Verificar que no exista ya una factura para esta orden ────────────
    const { data: facturaExistente } = await supabase
      .from('facturas')
      .select('id, numero_factura')
      .eq('orden_id', orden_id)
      .maybeSingle()

    if (facturaExistente) {
      return NextResponse.json(
        { error: `Ya existe la factura ${facturaExistente.numero_factura || '(borrador)'} para esta orden` },
        { status: 400 }
      )
    }

    // ── 3. Cargar configuración del taller ───────────────────────────────────
    const { data: config } = await supabase
      .from('taller_config')
      .select('serie_factura, porcentaje_iva, tarifa_hora')
      .eq('taller_id', auth.tallerId)
      .maybeSingle()

    const serie = config?.serie_factura || 'FA'
    const ivaPct = Number(config?.porcentaje_iva) || 21
    const precioHora = Number(config?.tarifa_hora) || 0

    // ── 4. Calcular totales desde líneas ─────────────────────────────────────
    const { data: lineas } = await supabase
      .from('lineas_orden')
      .select('*')
      .eq('orden_id', orden_id)

    let baseImponible = 0
    let ivaTotal = 0

    if (lineas && lineas.length > 0) {
      for (const l of lineas) {
        const cantidad = Number(l.cantidad) || 1
        let precioUnitario = Number(l.precio_unitario) || 0
        if (l.tipo === 'mano_obra' && precioUnitario === 0 && precioHora > 0) {
          precioUnitario = precioHora
        }
        const ivaPorLinea = Number(l.iva_porcentaje) || ivaPct
        const base = cantidad * precioUnitario
        baseImponible += base
        ivaTotal += base * (ivaPorLinea / 100)
      }
    } else {
      baseImponible = Number(orden.subtotal_mano_obra || 0) + Number(orden.subtotal_piezas || 0)
      ivaTotal = baseImponible * (ivaPct / 100)
    }

    const totalFactura = baseImponible + ivaTotal

    // ── 5. Validar límite de factura simplificada ────────────────────────────
    if (totalFactura >= LIMITE_SIMPLIFICADA) {
      return NextResponse.json(
        {
          error: `El Cobro Rápido solo está disponible para importes inferiores a ${LIMITE_SIMPLIFICADA}€ (factura simplificada). Total calculado: ${totalFactura.toFixed(2)}€`,
          total: totalFactura,
        },
        { status: 400 }
      )
    }

    // ── 6. Crear factura como borrador ───────────────────────────────────────
    const hoy = new Date().toISOString().split('T')[0]
    const vencimiento = new Date(Date.now() + 30 * 86400_000).toISOString().split('T')[0]

    const { data: borrador, error: borradorError } = await supabase
      .from('facturas')
      .insert([{
        taller_id: auth.tallerId,
        cliente_id: orden.cliente_id,
        orden_id,
        numero_factura: null,
        numero_serie: serie,
        fecha_emision: hoy,
        fecha_vencimiento: vencimiento,
        base_imponible: baseImponible,
        iva_porcentaje: ivaPct,
        iva: ivaTotal,
        total: totalFactura,
        metodo_pago: 'E', // Efectivo por defecto en cobro rápido
        estado: 'borrador',
        es_simplificada: true,
      }])
      .select()
      .single()

    if (borradorError || !borrador) {
      return NextResponse.json(
        { error: 'Error al crear la factura', details: borradorError?.message },
        { status: 500 }
      )
    }

    // Crear líneas de factura
    if (lineas && lineas.length > 0) {
      const lineasFactura = lineas.map((l: any, idx: number) => {
        const cantidad = Number(l.cantidad) || 1
        let precioUnitario = Number(l.precio_unitario) || 0
        if (l.tipo === 'mano_obra' && precioUnitario === 0 && precioHora > 0) {
          precioUnitario = precioHora
        }
        const ivaPorLinea = Number(l.iva_porcentaje) || ivaPct
        const base = cantidad * precioUnitario
        return {
          factura_id: borrador.id,
          numero_linea: idx + 1,
          concepto: l.tipo === 'mano_obra' ? 'Mano de obra' : l.tipo === 'pieza' ? 'Pieza' : 'Servicio',
          descripcion: l.descripcion || 'Servicio',
          cantidad,
          precio_unitario: precioUnitario,
          base_imponible: base,
          iva_porcentaje: ivaPorLinea,
          iva_importe: base * (ivaPorLinea / 100),
          total_linea: base,
          importe_total: base,
          tipo_linea: l.tipo || 'servicio',
        }
      })
      await supabase.from('detalles_factura').insert(lineasFactura)
    }

    // ── 7. Asignar número atómico via RPC ────────────────────────────────────
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('asignar_numero_factura_v2', {
        p_taller_id: auth.tallerId,
        p_prefijo: serie,
      })

    if (rpcError || !rpcResult) {
      return NextResponse.json(
        { error: 'Error al asignar número de factura', details: rpcError?.message },
        { status: 500 }
      )
    }

    const numeroFactura: string = rpcResult.numero_completo

    // ── 8. Calcular VeriFACTU ────────────────────────────────────────────────
    const huellaHash = calcularHuella({
      tallerId: auth.tallerId,
      numeroFactura,
      fechaEmision: hoy,
      baseImponible,
      iva: ivaTotal,
      total: totalFactura,
      clienteId: orden.cliente_id,
    })

    const { data: facturaAnterior } = await supabase
      .from('facturas')
      .select('huella_hash')
      .eq('taller_id', auth.tallerId)
      .neq('id', borrador.id)
      .in('estado', ['emitida', 'pagada'])
      .not('numero_factura', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // ── 9. Emitir y marcar como pagada ────────────────────────────────────────
    const { data: facturaFinal, error: emitirError } = await supabase
      .from('facturas')
      .update({
        numero_factura: numeroFactura,
        estado: 'pagada',
        huella_hash: huellaHash,
        encadenamiento_anterior: facturaAnterior?.huella_hash || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', borrador.id)
      .select()
      .single()

    if (emitirError || !facturaFinal) {
      return NextResponse.json(
        { error: 'Error al emitir la factura', numero_reservado: numeroFactura },
        { status: 500 }
      )
    }

    // ── 10. Actualizar orden a "facturado" ────────────────────────────────────
    await supabase
      .from('ordenes_reparacion')
      .update({ estado: 'facturado', updated_at: new Date().toISOString() })
      .eq('id', orden_id)

    return NextResponse.json({
      success: true,
      id: facturaFinal.id,
      numero_factura: numeroFactura,
      estado: 'pagada',
      total: totalFactura,
      es_simplificada: true,
      message: `✅ Cobro rápido completado. Factura simplificada ${numeroFactura} emitida y pagada.`,
    })
  } catch (error: any) {
    console.error('Error en cobro-rapido:', error)
    return NextResponse.json(
      { error: 'Error interno', details: error?.message },
      { status: 500 }
    )
  }
}
