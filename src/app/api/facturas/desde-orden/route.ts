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

    // ==================== VALIDACIONES INICIALES ====================
    console.log(`🚀 Iniciando creación de factura`)
    console.log(`   - Orden ID: ${orden_id}`)
    console.log(`   - Taller ID: ${taller_id}`)

    if (!orden_id || !taller_id) {
      console.error('❌ Faltan parámetros requeridos')
      return NextResponse.json(
        {
          error: 'Faltan datos requeridos',
          details: 'Se requieren orden_id y taller_id',
          sugerencia: 'Verifica que la orden esté seleccionada correctamente'
        },
        { status: 400 }
      )
    }

    // ==================== OBTENER CONFIGURACIÓN ====================
    console.log(`📋 Obteniendo configuración del taller...`)
    const { data: config, error: configError } = await supabase
      .from('taller_config')
      .select('serie_factura, numero_factura_inicial, iban, condiciones_pago, notas_factura, porcentaje_iva')
      .eq('taller_id', taller_id)
      .single()

    if (configError) {
      console.error('❌ Error obteniendo configuración:', configError)
      return NextResponse.json(
        {
          error: 'No se pudo obtener la configuración del taller',
          details: configError.message,
          sugerencia: 'Verifica que el taller esté configurado correctamente en Configuración'
        },
        { status: 500 }
      )
    }

    const serieFactura = config?.serie_factura || 'FA'
    const ivaPorcentaje = config?.porcentaje_iva || 21

    // Intentar obtener precio_hora_trabajo (puede no existir en la BD)
    let precioHoraTrabajo = 0
    try {
      const { data: configExtra } = await supabase
        .from('taller_config')
        .select('precio_hora_trabajo')
        .eq('taller_id', taller_id)
        .single()
      precioHoraTrabajo = configExtra?.precio_hora_trabajo || 0
    } catch (err) {
      // La columna no existe, usar 0 como fallback
      console.log('ℹ️  precio_hora_trabajo no disponible, usando 0€')
    }

    console.log(`✅ Configuración obtenida: Serie=${serieFactura}, IVA=${ivaPorcentaje}%, Precio hora=${precioHoraTrabajo}€`)

    // ==================== OBTENER Y VALIDAR ORDEN ====================
    console.log(`📦 Obteniendo orden ${orden_id}...`)
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
      console.error('❌ Orden no encontrada:', ordenError)
      return NextResponse.json(
        {
          error: 'Orden no encontrada',
          details: ordenError?.message || 'La orden no existe',
          sugerencia: 'Verifica que la orden exista y pertenezca a tu taller'
        },
        { status: 404 }
      )
    }

    console.log(`✅ Orden encontrada: ${orden.numero_orden || orden_id}`)
    console.log(`   - Cliente: ${orden.clientes?.nombre || 'Sin nombre'}`)
    console.log(`   - Estado: ${orden.estado}`)

    // Validar que el cliente existe
    if (!orden.cliente_id || !orden.clientes) {
      console.error('❌ La orden no tiene cliente asociado')
      return NextResponse.json(
        {
          error: 'Orden sin cliente',
          details: 'La orden debe tener un cliente asociado para generar factura',
          sugerencia: 'Edita la orden y asigna un cliente antes de facturar'
        },
        { status: 400 }
      )
    }

    // Verificar si ya existe una factura para esta orden
    console.log(`🔍 Verificando si ya existe factura para esta orden...`)
    const { data: facturaExistente } = await supabase
      .from('facturas')
      .select('id, numero_factura')
      .eq('orden_id', orden_id)
      .maybeSingle()

    if (facturaExistente) {
      console.warn(`⚠️  Ya existe factura: ${facturaExistente.numero_factura}`)
      return NextResponse.json(
        {
          error: 'Ya existe una factura para esta orden',
          details: `Factura ${facturaExistente.numero_factura} ya creada`,
          factura_id: facturaExistente.id,
          sugerencia: 'Si necesitas modificar la factura, edítala desde la sección de Facturas'
        },
        { status: 400 }
      )
    }
    console.log(`✅ No existe factura previa, procediendo...`)

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

    // Calcular totales CORRECTAMENTE desde las líneas
    let baseImponibleTotal = 0
    let ivaTotal = 0

    if (lineasOrden && lineasOrden.length > 0) {
      lineasOrden.forEach((linea: any) => {
        const cantidad = parseFloat(linea.cantidad) || 1
        const precioUnitario = parseFloat(linea.precio_unitario) || 0
        const ivaPorcentajeLinea = parseFloat(linea.iva_porcentaje) || ivaPorcentaje

        const baseLinea = cantidad * precioUnitario
        const ivaLinea = baseLinea * (ivaPorcentajeLinea / 100)

        baseImponibleTotal += baseLinea
        ivaTotal += ivaLinea
      })
    } else {
      // Fallback si no hay líneas
      baseImponibleTotal = orden.total_sin_iva || (orden.subtotal_mano_obra || 0) + (orden.subtotal_piezas || 0) || 0
      ivaTotal = orden.iva_amount || baseImponibleTotal * (ivaPorcentaje / 100)
    }

    const baseImponible = baseImponibleTotal
    const iva = ivaTotal
    const total = baseImponible + iva

    // ==================== NUEVO FLUJO: NUMERACIÓN INTELIGENTE ====================
    // Las facturas se crean como BORRADOR sin número, y se emiten automáticamente
    // Esto cumple con normativa española evitando huecos en numeración

    // ==================== CREAR FACTURA COMO BORRADOR ====================
    console.log(`💾 Creando borrador de factura para orden ${orden.numero_orden || orden_id}...`)
    console.log(`   - Base imponible: ${baseImponible.toFixed(2)}€`)
    console.log(`   - IVA (${ivaPorcentaje}%): ${iva.toFixed(2)}€`)
    console.log(`   - Total: ${total.toFixed(2)}€`)

    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .insert([{
        taller_id,
        cliente_id: orden.cliente_id,
        orden_id: orden_id, // Vincular factura con orden
        numero_factura: null, // SIN NÚMERO - se asigna al emitir
        numero_serie: serieFactura,
        fecha_emision: new Date().toISOString().split('T')[0],
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        base_imponible: baseImponible,
        iva_porcentaje: ivaPorcentaje,
        iva: iva,
        total: total,
        metodo_pago: 'T', // Transferencia por defecto para órdenes
        estado: 'borrador', // SIEMPRE borrador - se cambia al emitir
      }])
      .select()
      .single()

    if (facturaError || !factura) {
      console.error('❌ Error al crear borrador de factura:', facturaError)

      // Mensaje de error específico según el código
      let mensajeUsuario = 'Error al crear borrador de factura'
      let sugerencia = ''

      if (facturaError?.code === '23503') {
        // Foreign key violation
        mensajeUsuario = 'Error de relación: Datos vinculados no encontrados'
        sugerencia = `
POSIBLES CAUSAS:
- El cliente de la orden fue eliminado
- El taller no existe en la base de datos

SOLUCIÓN: Verifica que el cliente "${orden.clientes?.nombre}" exista en Clientes.
        `.trim()
      } else if (facturaError?.code === '22P02') {
        // Invalid input format
        mensajeUsuario = 'Formato de datos inválido'
        sugerencia = 'Hay datos con formato incorrecto. Verifica que los importes sean números válidos.'
      }

      return NextResponse.json(
        {
          error: mensajeUsuario,
          details: facturaError?.message || 'Sin detalles',
          code: facturaError?.code,
          sugerencia: sugerencia
        },
        { status: 500 }
      )
    }

    console.log(`✅ Borrador creado con ID: ${factura.id}`)

    // Crear líneas de factura desde las líneas de la orden
    if (lineasOrden && lineasOrden.length > 0) {
      const lineasFactura = lineasOrden.map((linea: any, index: number) => {
        const cantidad = parseFloat(linea.cantidad) || 1

        // Para mano de obra sin precio, usar precio_hora_trabajo de configuración
        let precioUnitario = parseFloat(linea.precio_unitario) || 0
        if (linea.tipo === 'mano_obra' && precioUnitario === 0 && precioHoraTrabajo > 0) {
          precioUnitario = precioHoraTrabajo
          console.log(`   ℹ️  Aplicando precio hora trabajo: ${precioHoraTrabajo}€ a línea de mano de obra`)
        }

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

        // Calcular importes
        // IMPORTANTE: total_linea es solo la BASE, el IVA se suma a nivel de factura
        const baseImponibleLinea = cantidad * precioUnitario
        const ivaImporte = baseImponibleLinea * (ivaPorcentajeLinea / 100)

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
          total_linea: baseImponibleLinea,  // Solo base, SIN IVA
          importe_total: baseImponibleLinea,  // Solo base, SIN IVA
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
      // Si no hay líneas, crear una línea genérica
      // IMPORTANTE: total_linea es solo la BASE, el IVA se suma a nivel de factura
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
          total_linea: baseImponible,  // Solo base, SIN IVA
          importe_total: baseImponible,  // Solo base, SIN IVA
          tipo_linea: 'servicio'
        }])

      if (lineaError) {
        console.error('Error creando línea genérica de factura:', lineaError)
      }
    }

    // Actualizar la orden
    await supabase
      .from('ordenes_reparacion')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', orden_id)

    // ==================== ÉXITO - BORRADOR CREADO ====================
    console.log(`✅ ¡BORRADOR DE FACTURA CREADO EXITOSAMENTE!`)
    console.log(`   - ID Borrador: ${factura.id}`)
    console.log(`   - Cliente: ${orden.clientes.nombre}`)
    console.log(`   - Total: ${total.toFixed(2)}€`)
    console.log(`   - Líneas: ${lineasOrden?.length || 1}`)
    console.log(`   ℹ️  La factura está en estado BORRADOR`)
    console.log(`   ℹ️  Debe emitirse desde la interfaz para asignar número`)

    return NextResponse.json({
      success: true,
      id: factura.id,
      numero_factura: null, // Sin número aún - es borrador
      estado: 'borrador',
      message: 'Borrador de factura creado correctamente',
      info: 'La factura se ha creado como borrador. Revísala y emítela desde la interfaz para asignar número.',
      datos: {
        factura_id: factura.id,
        cliente: orden.clientes.nombre,
        total: total,
        estado: 'borrador',
        lineas: lineasOrden?.length || 1,
        orden_numero: orden.numero_orden
      }
    })
  } catch (error: any) {
    console.error('❌ ERROR INESPERADO en desde-orden:', error)
    console.error('Stack:', error?.stack)

    return NextResponse.json(
      {
        error: 'Error inesperado al crear la factura',
        details: error?.message || error?.toString() || 'Sin detalles',
        sugerencia: `
ERROR TÉCNICO - Contacta con soporte proporcionando:
1. Hora exacta del error: ${new Date().toISOString()}
2. Este mensaje de error
3. Orden ID que intentabas facturar

El equipo técnico investigará el problema.
        `.trim(),
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}
