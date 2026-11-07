/**
 * API ENDPOINT: Emitir Factura
 *
 * Asigna número correlativo de la serie y cambia estado de 'borrador' a 'emitida' o 'pagada'
 * Cumple con normativa española: solo asigna número cuando la factura se confirma
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'
import { asignarNumeroFactura } from '@/lib/facturas/numeracion'
import { formatCurrency } from '@/lib/utils'
import crypto from 'crypto'

/** Calcula la huella SHA-256 para el encadenamiento VeriFACTU */
function calcularHuellaVeriFACTU(params: {
  tallerId: string
  numeroFactura: string
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  clienteId: string
}): string {
  const datos = [
    params.tallerId,
    params.numeroFactura,
    params.fechaEmision,
    params.baseImponible.toFixed(2),
    params.iva.toFixed(2),
    params.total.toFixed(2),
    params.clienteId,
  ].join('|')
  return crypto.createHash('sha256').update(datos, 'utf8').digest('hex').toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    // Validar autenticación
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) {
      return authErrorResponse(auth)
    }

    const supabase = await createClient()
    const body = await request.json()
    const { factura_id, estado_final } = body

    // Validaciones
    if (!factura_id) {
      return NextResponse.json(
        { error: 'factura_id es requerido' },
        { status: 400 }
      )
    }

    if (!estado_final || !['emitida', 'pagada'].includes(estado_final)) {
      return NextResponse.json(
        {
          error: 'estado_final debe ser "emitida" o "pagada"',
          recibido: estado_final
        },
        { status: 400 }
      )
    }

    // Obtener la factura
    const { data: factura, error: getError } = await supabase
      .from('facturas')
      .select('*, cliente:clientes(nombre)')
      .eq('id', factura_id)
      .eq('taller_id', auth.tallerId)
      .single()

    if (getError || !factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada o no tienes permiso' },
        { status: 404 }
      )
    }

    // Validar que sea un borrador
    if (factura.estado !== 'borrador') {
      return NextResponse.json(
        {
          error: 'Solo se pueden emitir facturas en estado "borrador"',
          estado_actual: factura.estado,
          sugerencia: factura.numero_factura
            ? `La factura ${factura.numero_factura} ya fue emitida anteriormente`
            : 'Esta factura ya tiene un estado definitivo'
        },
        { status: 400 }
      )
    }

    // Validar que no tenga número aún
    if (factura.numero_factura) {
      return NextResponse.json(
        {
          error: 'Esta factura ya tiene número asignado',
          numero_actual: factura.numero_factura,
          sugerencia: 'No se puede reasignar el número de una factura'
        },
        { status: 400 }
      )
    }

    const serieToUse = factura.numero_serie || 'FA'

    // ── OPERACIÓN ATÓMICA via RPC ────────────────────────────────────────────
    // asignar_numero_factura_v3 usa FOR UPDATE para bloquear la fila de la serie
    // y garantizar numeración sin duplicados incluso con emisiones simultáneas.
    // Formato devuelto: RS-2026-008 (año anual + LPAD 3 dígitos).
    const numeracion = await asignarNumeroFactura(supabase, auth.tallerId, serieToUse)

    if (!numeracion.ok) {
      return NextResponse.json(
        {
          error: `Error al asignar número de la serie "${serieToUse}"`,
          details: numeracion.errorMessage ?? 'El RPC no devolvió resultado',
          sugerencia: 'Verifica que la migración 20260225_final_consolidation.sql se ejecutó en Supabase',
        },
        { status: 500 }
      )
    }

    const numeroFactura: string = numeracion.numeroCompleto

    // ── VeriFACTU: calcular huella y encadenamiento ──────────────────────────
    const huellaHash = calcularHuellaVeriFACTU({
      tallerId: auth.tallerId,
      numeroFactura,
      fechaEmision: factura.fecha_emision || new Date().toISOString().split('T')[0],
      baseImponible: Number(factura.base_imponible) || 0,
      iva: Number(factura.iva) || 0,
      total: Number(factura.total) || 0,
      clienteId: factura.cliente_id,
    })

    // Obtener la huella de la última factura emitida de este taller para encadenar.
    // Orden created_at + id (tie-breaker) por consistencia con rapida/route.ts,
    // generar-verifactu/route.ts y cobro-rapido/route.ts. Sigue sin ser un orden
    // garantizado de secuencia de emisión real (ver A05 del INFORME): un borrador
    // creado antes puede emitirse después que otro creado más tarde. Cambiarlo
    // requiere revisar las 4 rutas a la vez, no solo esta.
    const { data: facturaAnterior } = await supabase
      .from('facturas')
      .select('huella_hash')
      .eq('taller_id', auth.tallerId)
      .neq('id', factura_id)
      .in('estado', ['emitida', 'pagada'])
      .not('numero_factura', 'is', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const encadenamientoAnterior = facturaAnterior?.huella_hash || null

    // Actualizar factura con número, estado y huellas VeriFACTU.
    // Condición .eq('estado', 'borrador').is('numero_factura', null): si dos
    // solicitudes llegan a la vez, cada una reserva un número distinto vía RPC,
    // pero solo la primera en llegar aquí gana este UPDATE — la segunda no
    // sobrescribe la factura ya emitida (evita doble número/estado inconsistente).
    const { data: facturaEmitida, error: emitirError } = await supabase
      .from('facturas')
      .update({
        numero_factura: numeroFactura,
        estado: estado_final,
        huella_hash: huellaHash,
        encadenamiento_anterior: encadenamientoAnterior,
        updated_at: new Date().toISOString()
      })
      .eq('id', factura_id)
      .eq('taller_id', auth.tallerId)
      .eq('estado', 'borrador')
      .is('numero_factura', null)
      .select()
      .maybeSingle()

    if (emitirError || !facturaEmitida) {
      // El número reservado por el RPC ya quedó committed en el contador de la
      // serie — no se revierte aquí porque haría race condition. Si perdimos la
      // carrera (otra solicitud emitió primero esta misma factura), lo tratamos
      // como éxito idempotente en vez de error, para que un doble clic no rompa la UI.
      const { data: facturaActual } = await supabase
        .from('facturas')
        .select('*')
        .eq('id', factura_id)
        .eq('taller_id', auth.tallerId)
        .maybeSingle()

      if (facturaActual?.numero_factura) {
        console.warn(`⚠️  Número ${numeroFactura} quedó reservado sin usar: la factura ${factura_id} ya fue emitida como ${facturaActual.numero_factura} por otra solicitud concurrente.`)
        return NextResponse.json({
          success: true,
          factura: facturaActual,
          numero_factura: facturaActual.numero_factura,
          estado: facturaActual.estado,
          message: `Factura ${facturaActual.numero_factura} ya estaba emitida`,
        })
      }

      console.error(`❌ Número ${numeroFactura} reservado pero UPDATE de factura falló:`, emitirError?.message)

      return NextResponse.json(
        {
          error: 'Error al emitir factura tras asignar número',
          numero_reservado: numeroFactura,
          details: emitirError?.message
        },
        { status: 500 }
      )
    }

    console.log(`✅ Factura ${numeroFactura} emitida correctamente`)
    console.log(`   - Estado: ${estado_final}`)
    console.log(`   - Cliente: ${factura.cliente?.nombre || 'N/A'}`)
    console.log(`   - Total: ${factura.total}€`)

    // Al emitir (asignar número), la orden pasa a "facturado" y queda bloqueada.
    // Los borradores (sin número) NUNCA tocan el estado de la orden — solo la emisión final.
    if (facturaEmitida.orden_id) {
      const { error: ordenUpdateError } = await supabase
        .from('ordenes_reparacion')
        .update({ estado: 'facturado', updated_at: new Date().toISOString() })
        .eq('id', facturaEmitida.orden_id)

      if (ordenUpdateError) {
        console.error(`⚠️  No se pudo auto-transicionar la orden ${facturaEmitida.orden_id} a "facturado":`, ordenUpdateError.message)
      } else {
        console.log(`   ℹ️  Orden ${facturaEmitida.orden_id} auto-transicionada a "facturado" tras emisión`)
      }
    }

    // 📢 TELEGRAM: Enviar notificación de factura emitida
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const chatId = process.env.TELEGRAM_CHAT_ID

      if (botToken && chatId) {
        const nombreCliente = factura.cliente?.nombre || 'Cliente'
        const mensaje = `
🧾 <b>Nueva Factura Emitida</b>

📋 Número: <b>${numeroFactura}</b>
👤 Cliente: ${nombreCliente}
💰 Total: <b>${formatCurrency(factura.total)}</b>
📅 Fecha: ${new Date().toLocaleDateString('es-ES')}
🔖 Estado: ${estado_final === 'pagada' ? '✅ Pagada' : '⏳ Pendiente'}
        `.trim()

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: mensaje,
            parse_mode: 'HTML'
          })
        })

        console.log('✅ Notificación enviada a Telegram')
      }
    } catch (telegramError) {
      // No fallar si Telegram falla - solo log
      console.warn('⚠️ Error al enviar notificación a Telegram:', telegramError)
    }

    return NextResponse.json({
      success: true,
      factura: facturaEmitida,
      numero_factura: numeroFactura,
      estado: estado_final,
      message: `Factura ${numeroFactura} ${estado_final === 'pagada' ? 'emitida y marcada como pagada' : 'emitida correctamente'}`,
    })
  } catch (error: any) {
    console.error('Error al emitir factura:', error)
    return NextResponse.json(
      {
        error: 'Error interno al emitir factura',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
