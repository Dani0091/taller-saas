/**
 * API ENDPOINT: Crear Factura desde Orden
 *
 * Convierte una orden de reparación completada en factura
 * Incluye todas las líneas de la orden y datos del vehículo
 * Usa la configuración del taller para numeración personalizada
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

    // Obtener configuración del taller para numeración
    const { data: config } = await supabase
      .from('taller_config')
      .select('serie_factura, numero_factura_inicial, iban, condiciones_pago, notas_factura, porcentaje_iva')
      .eq('taller_id', taller_id)
      .single()

    const serieFactura = config?.serie_factura || 'FA'
    const ivaPorcentaje = config?.porcentaje_iva || 21

    // Buscar la serie en series_facturacion para usar numeración consistente
    let siguienteNumero = config?.numero_factura_inicial || 1
    let serieId: string | null = null

    const { data: serieData } = await supabase
      .from('series_facturacion')
      .select('id, ultimo_numero')
      .eq('taller_id', taller_id)
      .eq('prefijo', serieFactura)
      .single()

    if (serieData) {
      // Si la serie existe en la tabla, usar su numeración
      siguienteNumero = serieData.ultimo_numero + 1
      serieId = serieData.id
    } else {
      // Serie no existe - CREARLA AUTOMÁTICAMENTE
      console.log(`Serie "${serieFactura}" no existe, creándola automáticamente...`)

      // Buscar el máximo en facturas existentes para no romper la secuencia
      let maxNumero = (config?.numero_factura_inicial || 1) - 1
      const { data: todasFacturas } = await supabase
        .from('facturas')
        .select('numero_factura')
        .eq('taller_id', taller_id)
        .eq('numero_serie', serieFactura)

      if (todasFacturas && todasFacturas.length > 0) {
        todasFacturas.forEach((f: { numero_factura: string }) => {
          const match = f.numero_factura.match(/(\d+)$/)
          if (match) {
            const num = parseInt(match[1], 10)
            if (num > maxNumero) maxNumero = num
          }
        })
      }

      // Crear la serie con el número máximo encontrado
      const { data: nuevaSerie, error: crearSerieError } = await supabase
        .from('series_facturacion')
        .insert([{
          taller_id,
          nombre: `Serie ${serieFactura}`,
          prefijo: serieFactura,
          ultimo_numero: maxNumero >= 0 ? maxNumero : 0
        }])
        .select()
        .single()

      if (nuevaSerie) {
        serieId = nuevaSerie.id
        siguienteNumero = nuevaSerie.ultimo_numero + 1
        console.log(`Serie "${serieFactura}" creada con ID: ${nuevaSerie.id}, siguiente: ${siguienteNumero}`)
      } else {
        console.error('Error creando serie:', crearSerieError)
        // Continuar con el número calculado si falla la creación
        siguienteNumero = maxNumero + 1
      }
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

    // Obtener líneas de la orden
    const { data: lineasOrden } = await supabase
      .from('lineas_orden')
      .select('*')
      .eq('orden_id', orden_id)

    // Generar número de factura con el formato estándar
    const numeroFactura = `${serieFactura}${siguienteNumero.toString().padStart(3, '0')}`

    // Calcular totales (asegurar valores numéricos válidos)
    const baseImponible = parseFloat(orden.total_sin_iva) ||
                          parseFloat(orden.subtotal_mano_obra || 0) + parseFloat(orden.subtotal_piezas || 0) ||
                          0
    const iva = parseFloat(orden.iva_amount) || (baseImponible * (ivaPorcentaje / 100))
    const total = parseFloat(orden.total_con_iva) || (baseImponible + iva)

    // Crear la factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .insert([{
        taller_id,
        cliente_id: orden.cliente_id,
        orden_id: orden_id,
        numero_factura: numeroFactura,
        numero_serie: serieFactura,
        fecha_emision: new Date().toISOString().split('T')[0],
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        base_imponible: baseImponible,
        iva_porcentaje: ivaPorcentaje,
        iva: iva,
        total: total,
        metodo_pago: 'Transferencia bancaria',
        estado: 'borrador',
        condiciones_pago: config?.condiciones_pago,
        notas_internas: config?.notas_factura,
      }])
      .select()
      .single()

    if (facturaError || !factura) {
      console.error('Error al crear factura:', facturaError)
      return NextResponse.json(
        {
          error: 'Error al crear la factura',
          details: facturaError?.message || 'Sin detalles',
          code: facturaError?.code
        },
        { status: 500 }
      )
    }

    // Crear líneas de factura desde las líneas de la orden
    if (lineasOrden && lineasOrden.length > 0) {
      const lineasFactura = lineasOrden.map((linea: any, index: number) => {
        const cantidad = parseFloat(linea.cantidad) || 1
        const precioUnitario = parseFloat(linea.precio_unitario) || 0
        const ivaPorcentajeLinea = parseFloat(linea.iva_porcentaje) || ivaPorcentaje

        // Determinar concepto y tipo basado en el tipo de línea
        let concepto = 'Servicio'
        let tipoLinea = 'servicio'

        if (linea.tipo === 'mano_obra') {
          concepto = 'Mano de obra'
          tipoLinea = 'servicio'
        } else if (linea.tipo === 'pieza') {
          concepto = 'Pieza / Repuesto'
          tipoLinea = 'servicio'
        } else if (linea.tipo === 'servicio') {
          concepto = 'Servicio'
          tipoLinea = 'servicio'
        } else if (linea.tipo === 'suplido') {
          concepto = 'Suplido'
          tipoLinea = 'suplido'
        } else if (linea.tipo === 'reembolso') {
          concepto = 'Reembolso'
          tipoLinea = 'reembolso'
        }

        // Calcular importes según el tipo de línea
        // IMPORTANTE: Los suplidos NO llevan IVA (ya fue pagado en la operación original)
        const baseImponibleLinea = cantidad * precioUnitario
        const ivaImporte = tipoLinea === 'suplido' ? 0 : baseImponibleLinea * (ivaPorcentajeLinea / 100)
        const totalLinea = baseImponibleLinea + ivaImporte

        return {
          factura_id: factura.id,
          numero_linea: index + 1,
          concepto: concepto,
          descripcion: linea.descripcion || linea.concepto || 'Servicio',
          cantidad: cantidad,
          precio_unitario: precioUnitario,
          base_imponible: baseImponibleLinea,
          iva_porcentaje: ivaPorcentajeLinea,
          iva_importe: ivaImporte,
          total_linea: totalLinea,
          importe_total: totalLinea,
          tipo_linea: tipoLinea
        }
      })

      const { error: lineasError } = await supabase
        .from('lineas_factura')
        .insert(lineasFactura)

      if (lineasError) {
        console.error('Error creando líneas de factura:', lineasError)
        console.error('Líneas que intentamos insertar:', JSON.stringify(lineasFactura, null, 2))
        return NextResponse.json(
          {
            error: 'Error al crear líneas de factura',
            details: lineasError?.message || 'Sin detalles',
            code: lineasError?.code
          },
          { status: 500 }
        )
      }
    } else {
      // Si no hay líneas, crear una línea genérica con el total
      const { error: lineaError } = await supabase
        .from('lineas_factura')
        .insert([{
          factura_id: factura.id,
          numero_linea: 1,
          concepto: 'Reparación',
          descripcion: `Reparación vehículo ${orden.vehiculos?.matricula || ''} - ${orden.descripcion_problema || 'Servicio de taller'}`,
          cantidad: 1,
          precio_unitario: baseImponible,
          base_imponible: baseImponible,
          iva_porcentaje: ivaPorcentaje,
          iva_importe: iva,
          total_linea: total,
          importe_total: total,
          tipo_linea: 'servicio'
        }])

      if (lineaError) {
        console.error('Error creando línea genérica de factura:', lineaError)
      }
    }

    // Actualizar la orden (solo campos que existen en la base de datos)
    await supabase
      .from('ordenes_reparacion')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', orden_id)

    // Actualizar la numeración de la serie usada
    if (serieId) {
      // Si usamos series_facturacion, actualizar ahí
      await supabase
        .from('series_facturacion')
        .update({
          ultimo_numero: siguienteNumero,
          updated_at: new Date().toISOString()
        })
        .eq('id', serieId)
    } else {
      // Si usamos taller_config (fallback), actualizar ahí
      await supabase
        .from('taller_config')
        .update({
          numero_factura_inicial: siguienteNumero + 1,
          updated_at: new Date().toISOString()
        })
        .eq('taller_id', taller_id)
    }

    return NextResponse.json({
      success: true,
      id: factura.id,
      numero_factura: numeroFactura,
      message: `Factura ${numeroFactura} creada correctamente`,
    })
  } catch (error: any) {
    console.error('Error en desde-orden:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error?.message || error?.toString() || 'Sin detalles',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}
