/**
 * API: Factura Rápida (Serie FS)
 *
 * Emite una factura simplificada standalone — sin necesidad de orden previa.
 * Llama a asignar_numero_factura_v3(taller_id, 'FS') para numeración atómica.
 * Calcula huella VeriFACTU y encadenamiento con la FS anterior.
 *
 * Regla de negocio R&S:
 *   total > 400 € → cliente_id obligatorio con NIF y dirección completos.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'
import crypto from 'crypto'

const LIMITE_SIN_CLIENTE = 400

function calcularHuellaFS(params: {
  tallerId: string
  numeroFactura: string
  fecha: string
  baseImponible: number
  iva: number
  total: number
  matricula: string
}): string {
  const datos = [
    params.tallerId,
    params.numeroFactura,
    params.fecha,
    params.baseImponible.toFixed(2),
    params.iva.toFixed(2),
    params.total.toFixed(2),
    params.matricula.toUpperCase(),
  ].join('|')
  return crypto.createHash('sha256').update(datos, 'utf8').digest('hex').toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)

    const supabase = await createClient()
    const body = await request.json()

    const {
      matricula,
      vehiculo_id,
      cliente_id,
      lineas_items,
      iva_porcentaje = 21,
      metodo_pago = 'E',
    }: {
      matricula: string
      vehiculo_id?: string | null
      cliente_id?: string | null
      lineas_items: Array<{
        concepto: string
        descripcion?: string
        cantidad: number
        precio_unitario: number
      }>
      iva_porcentaje?: number
      metodo_pago?: string
    } = body

    // ── Validaciones básicas ─────────────────────────────────────────────────
    if (!matricula?.trim()) {
      return NextResponse.json({ error: 'La matrícula es obligatoria' }, { status: 400 })
    }

    if (!lineas_items || lineas_items.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos una línea' }, { status: 400 })
    }

    // ── Calcular importes ────────────────────────────────────────────────────
    const baseImponible = lineas_items.reduce(
      (sum, l) => sum + (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0),
      0
    )
    const iva = baseImponible * (iva_porcentaje / 100)
    const total = baseImponible + iva

    // ── Regla 400€: exigir cliente identificado ──────────────────────────────
    if (total > LIMITE_SIN_CLIENTE) {
      if (!cliente_id) {
        return NextResponse.json(
          {
            error: `Total ${total.toFixed(2)}€ supera el límite de ${LIMITE_SIN_CLIENTE}€`,
            detalle: 'Para importes superiores a 400€ es obligatorio identificar al cliente con NIF y dirección.',
            codigo: 'CLIENTE_REQUERIDO',
          },
          { status: 422 }
        )
      }

      // Verificar que el cliente tiene NIF y dirección
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id, nombre, nif, direccion')
        .eq('id', cliente_id)
        .eq('taller_id', auth.tallerId)
        .single()

      if (!cliente?.nif || !cliente?.direccion) {
        return NextResponse.json(
          {
            error: 'El cliente no tiene NIF o dirección registrados',
            detalle: 'Actualiza los datos del cliente antes de emitir facturas superiores a 400€.',
            codigo: 'DATOS_CLIENTE_INCOMPLETOS',
          },
          { status: 422 }
        )
      }
    }

    // ── Número atómico vía RPC v3 ────────────────────────────────────────────
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('asignar_numero_factura_v3', {
        p_taller_id: auth.tallerId,
        p_prefijo: 'FS',
      })

    if (rpcError || !rpcResult) {
      return NextResponse.json(
        {
          error: 'Error al asignar número de la serie FS',
          details: rpcError?.message ?? 'RPC no devolvió resultado',
          sugerencia: 'Verifica que la migración 20260304_factura_rapida.sql se ejecutó en Supabase',
        },
        { status: 500 }
      )
    }

    const numeroFactura: string = rpcResult.numero_completo
    const fecha = new Date().toISOString().split('T')[0]

    // ── VeriFACTU: huella y encadenamiento ──────────────────────────────────
    const huellaHash = calcularHuellaFS({
      tallerId: auth.tallerId,
      numeroFactura,
      fecha,
      baseImponible,
      iva,
      total,
      matricula,
    })

    const { data: fsAnterior } = await supabase
      .from('facturas_simplificadas')
      .select('huella_hash')
      .eq('taller_id', auth.tallerId)
      .not('numero_factura', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const encadenamientoAnterior = fsAnterior?.huella_hash ?? null

    // ── Insertar factura simplificada ────────────────────────────────────────
    const { data: fs, error: insertError } = await supabase
      .from('facturas_simplificadas')
      .insert([{
        taller_id: auth.tallerId,
        numero_factura: numeroFactura,
        fecha,
        matricula: matricula.toUpperCase().trim(),
        vehiculo_id: vehiculo_id ?? null,
        cliente_id: cliente_id ?? null,
        lineas_items,
        base_imponible: baseImponible,
        iva_porcentaje,
        iva,
        total,
        metodo_pago,
        huella_hash: huellaHash,
        encadenamiento_anterior: encadenamientoAnterior,
      }])
      .select()
      .single()

    if (insertError || !fs) {
      console.error('Error insertando factura_simplificada:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar la factura', details: insertError?.message },
        { status: 500 }
      )
    }

    console.log(`✅ Factura Rápida ${numeroFactura} emitida — ${total.toFixed(2)}€ — matrícula ${matricula}`)

    return NextResponse.json({
      success: true,
      id: fs.id,
      numero_factura: numeroFactura,
      total,
      base_imponible: baseImponible,
      iva,
      iva_porcentaje,
      fecha,
      matricula: fs.matricula,
      metodo_pago,
      message: `Factura ${numeroFactura} emitida correctamente`,
    })
  } catch (e: any) {
    console.error('Error en /api/facturas/rapida:', e)
    return NextResponse.json(
      { error: 'Error inesperado', details: e?.message },
      { status: 500 }
    )
  }
}
