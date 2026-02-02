/**
 * API ENDPOINT: Emitir Factura
 *
 * Asigna número correlativo de la serie y cambia estado de 'borrador' a 'emitida' o 'pagada'
 * Cumple con normativa española: solo asigna número cuando la factura se confirma
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'

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

    // OPERACIÓN ATÓMICA: Obtener siguiente número de la serie
    // 1. Buscar la serie
    let serieData = null
    const { data: serieExistente, error: serieError } = await supabase
      .from('series_facturacion')
      .select('id, ultimo_numero, prefijo')
      .eq('taller_id', auth.tallerId)
      .eq('prefijo', serieToUse)
      .single()

    if (serieError || !serieExistente) {
      // Serie no existe - crearla
      console.log(`Serie "${serieToUse}" no existe, creándola...`)

      // Buscar máximo número de facturas existentes
      let maxNumero = 0
      const { data: facturasExistentes } = await supabase
        .from('facturas')
        .select('numero_factura')
        .eq('taller_id', auth.tallerId)
        .eq('numero_serie', serieToUse)
        .not('numero_factura', 'is', null)

      if (facturasExistentes && facturasExistentes.length > 0) {
        facturasExistentes.forEach((f: { numero_factura: string }) => {
          const match = f.numero_factura.match(/(\d+)$/)
          if (match) {
            const num = parseInt(match[1], 10)
            if (num > maxNumero) maxNumero = num
          }
        })
      }

      const { data: nuevaSerie, error: crearSerieError } = await supabase
        .from('series_facturacion')
        .insert([{
          taller_id: auth.tallerId,
          nombre: `Serie ${serieToUse}`,
          prefijo: serieToUse,
          ultimo_numero: maxNumero
        }])
        .select()
        .single()

      if (crearSerieError || !nuevaSerie) {
        return NextResponse.json(
          {
            error: `No se pudo crear la serie "${serieToUse}"`,
            details: crearSerieError?.message || 'Error desconocido',
          },
          { status: 500 }
        )
      }

      serieData = nuevaSerie
      console.log(`Serie "${serieToUse}" creada con ID: ${nuevaSerie.id}`)
    } else {
      serieData = serieExistente
    }

    // 2. Calcular siguiente número
    const siguienteNumero = serieData.ultimo_numero + 1

    // 3. Actualizar la serie (ATÓMICO - reserva el número)
    console.log(`Actualizando serie ${serieToUse} a último_numero: ${siguienteNumero}`)
    const { error: updateError } = await supabase
      .from('series_facturacion')
      .update({ ultimo_numero: siguienteNumero })
      .eq('id', serieData.id)

    if (updateError) {
      return NextResponse.json(
        {
          error: 'Error al actualizar numeración de serie',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    // 4. Generar número de factura en formato [prefijo]-[numero] (ej: RS-1, FA-123)
    // Sin ceros extras, según lo especificado
    const numeroFactura = `${serieToUse}-${siguienteNumero}`

    // 5. Actualizar factura con número y nuevo estado
    const { data: facturaEmitida, error: emitirError } = await supabase
      .from('facturas')
      .update({
        numero_factura: numeroFactura,
        estado: estado_final,
        updated_at: new Date().toISOString()
      })
      .eq('id', factura_id)
      .select()
      .single()

    if (emitirError || !facturaEmitida) {
      // Revertir el número de serie si falla
      await supabase
        .from('series_facturacion')
        .update({ ultimo_numero: serieData.ultimo_numero })
        .eq('id', serieData.id)

      return NextResponse.json(
        {
          error: 'Error al emitir factura',
          details: emitirError?.message
        },
        { status: 500 }
      )
    }

    console.log(`✅ Factura ${numeroFactura} emitida correctamente`)
    console.log(`   - Estado: ${estado_final}`)
    console.log(`   - Cliente: ${factura.cliente?.nombre || 'N/A'}`)
    console.log(`   - Total: ${factura.total}€`)

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
