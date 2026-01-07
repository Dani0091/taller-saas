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

    // Verificar sesión
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

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

    // Generar número de factura secuencial (buscar el número más alto)
    const { data: todasFacturas } = await supabase
      .from('facturas')
      .select('numero_factura')
      .eq('taller_id', taller_id)
      .like('numero_factura', 'FA%')

    let maxNumero = 0
    if (todasFacturas && todasFacturas.length > 0) {
      todasFacturas.forEach((f: { numero_factura: string }) => {
        const match = f.numero_factura.match(/FA(\d+)/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNumero) maxNumero = num
        }
      })
    }

    const siguienteNumero = maxNumero + 1
    const numeroFactura = `FA${siguienteNumero.toString().padStart(3, '0')}`

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
          estado: estado || 'borrador',
          iva_porcentaje: 21,
        },
      ])
      .select()

    if (facturaError || !factura) {
      return NextResponse.json(
        { error: 'Error al crear factura', details: facturaError?.message },
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
        return NextResponse.json(
          { error: 'Error al crear líneas de factura', details: lineasError?.message },
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
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
