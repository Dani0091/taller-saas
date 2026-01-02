/**
 * API ENDPOINT: Crear Factura desde Orden
 *
 * Convierte una orden de reparación completada en factura
 * Incluye todas las líneas de la orden y datos del vehículo
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { orden_id, taller_id } = body

    if (!orden_id || !taller_id) {
      return NextResponse.json(
        { error: 'orden_id y taller_id son requeridos' },
        { status: 400 }
      )
    }

    // Obtener la orden con todas sus relaciones
    const { data: orden, error: ordenError } = await supabase
      .from('ordenes_reparacion')
      .select(`
        *,
        clientes(*),
        vehiculos(*)
      `)
      .eq('id', orden_id)
      .eq('taller_id', taller_id)
      .single()

    if (ordenError || !orden) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que la orden esté completada o en estado válido para facturar
    const estadosValidos = ['aprobado', 'en_reparacion', 'completado', 'entregado']
    if (!estadosValidos.includes(orden.estado)) {
      return NextResponse.json(
        { error: 'La orden debe estar aprobada o completada para generar factura' },
        { status: 400 }
      )
    }

    // Nota: No verificamos duplicados porque orden_id no existe en la tabla facturas

    // Obtener líneas de la orden
    const { data: lineasOrden } = await supabase
      .from('lineas_orden')
      .select('*')
      .eq('orden_id', orden_id)

    // Generar número de factura secuencial
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

    // Calcular totales
    const baseImponible = orden.total_sin_iva || orden.subtotal_mano_obra + orden.subtotal_piezas || 0
    const ivaPorcentaje = 21
    const iva = orden.iva_amount || baseImponible * (ivaPorcentaje / 100)
    const total = orden.total_con_iva || baseImponible + iva

    // Crear la factura (solo campos que existen en la BD real)
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .insert([{
        taller_id,
        cliente_id: orden.cliente_id,
        numero_factura: numeroFactura,
        numero_serie: 'FA',
        fecha_emision: new Date().toISOString().split('T')[0],
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        base_imponible: baseImponible,
        iva_porcentaje: ivaPorcentaje,
        iva: iva,
        total: total,
        metodo_pago: 'Transferencia bancaria',
        estado: 'borrador',
      }])
      .select()
      .single()

    if (facturaError || !factura) {
      console.error('Error al crear factura:', facturaError)
      return NextResponse.json(
        { error: 'Error al crear la factura' },
        { status: 500 }
      )
    }

    // Crear líneas de factura desde las líneas de la orden
    if (lineasOrden && lineasOrden.length > 0) {
      const lineasFactura = lineasOrden.map((linea: any) => ({
        factura_id: factura.id,
        descripcion: linea.descripcion || linea.concepto,
        cantidad: linea.cantidad || 1,
        precio_unitario: linea.precio_unitario || linea.precio || 0,
      }))

      await supabase
        .from('lineas_factura')
        .insert(lineasFactura)
    } else {
      // Si no hay líneas, crear una línea genérica con el total
      await supabase
        .from('lineas_factura')
        .insert([{
          factura_id: factura.id,
          descripcion: `Reparación vehículo ${orden.vehiculos?.matricula || ''} - ${orden.descripcion_problema || 'Servicio de taller'}`,
          cantidad: 1,
          precio_unitario: baseImponible,
        }])
    }

    // Actualizar la orden (solo campos que existen en la base de datos)
    await supabase
      .from('ordenes_reparacion')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', orden_id)

    return NextResponse.json({
      success: true,
      id: factura.id,
      numero_factura: numeroFactura,
      message: `Factura ${numeroFactura} creada correctamente`,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
