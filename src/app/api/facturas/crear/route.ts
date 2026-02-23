/**
 * API ENDPOINT: Crear Factura
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar sesión
    const { data: { user }, error: sessionError } = await supabase.auth.getUser()
    if (sessionError) {
      return NextResponse.json({ error: 'Error de sesión', details: sessionError.message }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      taller_id,
      cliente_id,
      serie,
      fecha_emision,
      fecha_vencimiento,
      base_imponible,
      iva,
      total,
      metodo_pago,
      estado,
      lineas,
      persona_contacto,
      telefono_contacto,
      condiciones_pago,
      notas_internas,
      // Campos adicionales para renting/flotas
      numero_autorizacion,
    } = body

    // Validaciones
    if (!taller_id || !cliente_id) {
      return NextResponse.json(
        { error: 'taller_id y cliente_id son requeridos', received: { taller_id, cliente_id } },
        { status: 400 }
      )
    }

    // Obtener datos del cliente
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id, nombre')
      .eq('id', cliente_id)
      .single()

    if (clienteError) {
      return NextResponse.json(
        { error: 'Error al buscar cliente', details: clienteError.message, code: clienteError.code },
        { status: 500 }
      )
    }

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Determinar serie a usar (del body o de la configuración del taller)
    let serieToUse = serie || 'FA'

    // ✅ Obtener configuración del taller desde configuracion_taller (IVA, serie, etc.)
    const { data: tallerConfig } = await supabase
      .from('configuracion_taller')
      .select('serie_factura_default, porcentaje_iva')
      .eq('taller_id', taller_id)
      .single()

    const ivaPorcentajeConfig = tallerConfig?.porcentaje_iva || 21

    if (!serie && tallerConfig?.serie_factura_default) {
      serieToUse = tallerConfig.serie_factura_default
    }

    // NUEVO FLUJO: Las facturas se crean siempre como BORRADOR sin número
    // El número se asigna al EMITIR la factura (endpoint /emitir)
    // Esto evita huecos en la numeración según normativa española

    // Crear factura como BORRADOR (sin número aún)
    const facturaData: Record<string, any> = {
      taller_id,
      cliente_id,
      numero_factura: null, // Sin número aún - se asignará al emitir
      numero_serie: serieToUse, // Guardamos la serie para usar después
      fecha_emision: fecha_emision || new Date().toISOString().split('T')[0],
      fecha_vencimiento,
      base_imponible: base_imponible || 0,
      iva: iva || 0,
      total: total || 0,
      metodo_pago,
      estado: 'borrador', // SIEMPRE crear como borrador - se cambia al emitir
      iva_porcentaje: ivaPorcentajeConfig,
    }

    // Añadir campos opcionales de contacto si están presentes
    if (persona_contacto) {
      facturaData.persona_contacto = persona_contacto
    }
    if (telefono_contacto) {
      facturaData.telefono_contacto = telefono_contacto
    }
    if (condiciones_pago) {
      facturaData.condiciones_pago = condiciones_pago
    }
    if (notas_internas) {
      facturaData.notas_internas = notas_internas
    }
    // Campos para renting/flotas
    if (numero_autorizacion) {
      facturaData.numero_autorizacion = numero_autorizacion
    }

    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .insert([facturaData])
      .select()

    if (facturaError) {
      return NextResponse.json(
        { error: 'Error al crear factura', details: facturaError.message, code: facturaError.code, data: facturaData },
        { status: 500 }
      )
    }

    if (!factura || factura.length === 0) {
      return NextResponse.json({ error: 'Factura no creada, sin error específico' }, { status: 500 })
    }

    const facturaId = factura[0].id

    // Crear líneas de factura
    if (lineas && lineas.length > 0) {
      const lineasData = lineas.map((linea: any, index: number) => {
        const cantidad = parseFloat(linea.cantidad) || 1
        const precioUnitario = parseFloat(linea.precioUnitario || linea.precio_unitario) || 0
        const ivaPorcentajeLinea = parseFloat(linea.iva_porcentaje) || ivaPorcentajeConfig
        const tipoLinea = linea.tipo_linea || 'servicio'

        // Calcular importes
        // IMPORTANTE: total_linea es solo la BASE, el IVA se suma a nivel de factura
        const baseImponibleLinea = cantidad * precioUnitario
        const ivaImporte = baseImponibleLinea * (ivaPorcentajeLinea / 100)

        return {
          factura_id: facturaId,
          numero_linea: index + 1,
          concepto: linea.concepto || linea.descripcion || 'Servicio',
          descripcion: linea.descripcion || null,
          cantidad: cantidad,
          precio_unitario: precioUnitario,
          base_imponible: baseImponibleLinea,
          iva_porcentaje: ivaPorcentajeLinea,
          iva_importe: ivaImporte,
          total_linea: baseImponibleLinea,  // Solo base, SIN IVA
          importe_total: baseImponibleLinea,  // Solo base, SIN IVA
          tipo_linea: tipoLinea
        }
      })

      const { error: lineasError } = await supabase
        .from('detalles_factura')
        .insert(lineasData)

      if (lineasError) {
        return NextResponse.json(
          { error: 'Error al crear líneas', details: lineasError.message, facturaId },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      id: facturaId,
      numero_factura: null, // Sin número aún - es un borrador
      estado: 'borrador',
      message: 'Borrador de factura creado correctamente',
      info: 'Para asignar número y emitir la factura, usa el endpoint /api/facturas/emitir',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error interno', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
