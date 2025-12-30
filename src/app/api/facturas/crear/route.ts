/**
 * API ENDPOINT: Crear Factura
 * 
 * Crea una nueva factura con:
 * - Datos básicos
 * - Líneas de factura
 * - Número secuencial automático
 * - Estado inicial: borrador
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const {
      taller_id,
      cliente_id,
      fecha_emision,
      fecha_vencimiento,
      base_imponible,
      iva,
      total,
      metodo_pago,
      notas,
      condiciones_pago,
      estado,
      lineas,
    } = body

    // Validaciones
    if (!taller_id || !cliente_id) {
      return NextResponse.json(
        { error: 'taller_id y cliente_id son requeridos' },
        { status: 400 }
      )
    }

    // Obtener datos del cliente
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', cliente_id)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Obtener datos del taller
    const { data: taller, error: tallerError } = await supabase
      .from('talleres')
      .select('*')
      .eq('id', taller_id)
      .single()

    if (tallerError || !taller) {
      return NextResponse.json(
        { error: 'Taller no encontrado' },
        { status: 404 }
      )
    }

    // Generar número de factura secuencial
    const { data: ultimaFactura } = await supabase
      .from('facturas')
      .select('numero_factura')
      .eq('taller_id', taller_id)
      .order('created_at', { ascending: false })
      .limit(1)

    let numeroFactura = 'FA001'
    if (ultimaFactura && ultimaFactura.length > 0) {
      const ultimoNumero = ultimaFactura[0].numero_factura
      const numero = parseInt(ultimoNumero.replace('FA', '')) + 1
      numeroFactura = `FA${numero.toString().padStart(3, '0')}`
    }

    // Crear factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .insert([
        {
          taller_id,
          cliente_id,
          numero_factura: numeroFactura,
          numero_serie: 'FA',
          fecha_emision,
          fecha_vencimiento,
          base_imponible,
          iva,
          total,
          metodo_pago,
          notas,
          condiciones_pago,
          estado: estado || 'borrador',
          iva_porcentaje: 21,
        },
      ])
      .select()

    if (facturaError || !factura) {
      console.error('Error al crear factura:', facturaError)
      return NextResponse.json(
        { error: 'Error al crear factura' },
        { status: 500 }
      )
    }

    const facturaId = factura[0].id

    // Crear líneas de factura
    if (lineas && lineas.length > 0) {
      const lineasData = lineas.map((linea: any) => ({
        factura_id: facturaId,
        descripcion: linea.descripcion,
        cantidad: linea.cantidad,
        precio_unitario: linea.precioUnitario,
      }))

      const { error: lineasError } = await supabase
        .from('lineas_factura')
        .insert(lineasData)

      if (lineasError) {
        console.error('Error al crear líneas:', lineasError)
        return NextResponse.json(
          { error: 'Error al crear líneas de factura' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      id: facturaId,
      numero_factura: numeroFactura,
      message: 'Factura creada correctamente',
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
