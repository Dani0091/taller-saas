/**
 * API ENDPOINT: Crear Factura
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      return NextResponse.json({ error: 'Error de sesión', details: sessionError.message }, { status: 401 })
    }
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
      estado,
      lineas,
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

    // Generar número de factura
    const { data: todasFacturas, error: facturasError } = await supabase
      .from('facturas')
      .select('numero_factura')
      .eq('taller_id', taller_id)
      .like('numero_factura', 'FA%')

    if (facturasError) {
      return NextResponse.json(
        { error: 'Error al buscar facturas existentes', details: facturasError.message },
        { status: 500 }
      )
    }

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
    const facturaData = {
      taller_id,
      cliente_id,
      numero_factura: numeroFactura,
      numero_serie: 'FA',
      fecha_emision: fecha_emision || new Date().toISOString().split('T')[0],
      fecha_vencimiento,
      base_imponible: base_imponible || 0,
      iva: iva || 0,
      total: total || 0,
      metodo_pago,
      estado: estado || 'borrador',
      iva_porcentaje: 21,
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
      const lineasData = lineas.map((linea: any, index: number) => ({
        factura_id: facturaId,
        numero_linea: index + 1,
        descripcion: linea.descripcion || 'Sin descripción',
        cantidad: linea.cantidad || 1,
        precio_unitario: linea.precioUnitario || linea.precio_unitario || 0,
      }))

      const { error: lineasError } = await supabase
        .from('lineas_factura')
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
      numero_factura: numeroFactura,
      message: 'Factura creada correctamente',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error interno', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
