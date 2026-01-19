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
    console.log(`✅ Configuración obtenida: Serie=${serieFactura}, IVA=${ivaPorcentaje}%`)

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
        console.log(`✅ Serie "${serieFactura}" creada exitosamente`)
        console.log(`   - ID: ${nuevaSerie.id}`)
        console.log(`   - Último número: ${nuevaSerie.ultimo_numero}`)
        console.log(`   - Siguiente factura será: ${serieFactura}${siguienteNumero.toString().padStart(3, '0')}`)
      } else {
        console.error('❌ Error creando serie:', crearSerieError)
        console.log(`⚠️  Usando fallback: taller_config.numero_factura_inicial`)
        // Continuar con el número calculado si falla la creación
        siguienteNumero = maxNumero + 1
        serieId = null // Asegurar que es null para usar fallback
      }
    }

    // Log de verificación antes de crear factura
    console.log(`📝 Creando factura:`)
    console.log(`   - Serie: ${serieFactura}`)
    console.log(`   - Número que se usará: ${siguienteNumero}`)
    console.log(`   - Serie ID: ${serieId || 'null (usando fallback)'}`)
    console.log(`   - Factura completa: ${serieFactura}${siguienteNumero.toString().padStart(3, '0')}`)

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

    // ACTUALIZAR LA SERIE PRIMERO (operación atómica para evitar duplicados)
    if (serieId) {
      console.log(`🔄 Actualizando serie ${serieFactura} a último_numero: ${siguienteNumero}`)
      const { error: updateError } = await supabase
        .from('series_facturacion')
        .update({
          ultimo_numero: siguienteNumero
        })
        .eq('id', serieId)

      if (updateError) {
        console.error('❌ Error actualizando serie:', updateError)
        return NextResponse.json(
          {
            error: 'Error al actualizar numeración de serie',
            details: updateError?.message,
            code: updateError?.code,
            sugerencia: 'La serie existe pero no se pudo actualizar. Verifica los permisos en Supabase.'
          },
          { status: 500 }
        )
      }
      console.log(`✅ Serie actualizada correctamente`)
    } else {
      // Si no hay serieId, significa que NO existe en series_facturacion
      // Actualizar taller_config como fallback
      console.log(`⚠️  Sin serieId, actualizando taller_config.numero_factura_inicial a ${siguienteNumero + 1}`)
      const { error: configError } = await supabase
        .from('taller_config')
        .update({
          numero_factura_inicial: siguienteNumero + 1
        })
        .eq('taller_id', taller_id)

      if (configError) {
        console.error('❌ Error actualizando taller_config:', configError)
      } else {
        console.log(`✅ taller_config actualizado`)
      }
    }

    // Generar número de factura con el formato estándar
    const numeroFactura = `${serieFactura}${siguienteNumero.toString().padStart(3, '0')}`

    // Calcular totales desde la orden (sin lógica especial para suplidos)
    const baseImponible = orden.total_sin_iva || (orden.subtotal_mano_obra || 0) + (orden.subtotal_piezas || 0) || 0
    const iva = orden.iva_amount || baseImponible * (ivaPorcentaje / 100)
    const total = orden.total_con_iva || baseImponible + iva

    // ==================== CREAR FACTURA ====================
    console.log(`💾 Creando factura ${numeroFactura}...`)
    console.log(`   - Base imponible: ${baseImponible.toFixed(2)}€`)
    console.log(`   - IVA (${ivaPorcentaje}%): ${iva.toFixed(2)}€`)
    console.log(`   - Total: ${total.toFixed(2)}€`)

    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .insert([{
        taller_id,
        cliente_id: orden.cliente_id,
        orden_id: orden_id, // Vincular factura con orden
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
      }])
      .select()
      .single()

    if (facturaError || !factura) {
      console.error('Error al crear factura:', facturaError)

      // Mensaje de error específico según el código
      let mensajeUsuario = 'Error al crear la factura'
      let sugerencia = ''

      if (facturaError?.code === '23505') {
        // Duplicate key - número de factura ya existe
        mensajeUsuario = `Ya existe una factura con el número ${numeroFactura}`
        sugerencia = `
ESTO ES NORMAL si acabas de crear otra factura. SOLUCIONES:

1. ESPERA 5 SEGUNDOS e intenta de nuevo (el sistema se auto-corregirá)
2. Si persiste, ve a Configuración → Facturas y verifica:
   - La serie "${serieFactura}" existe
   - El último número de la serie está actualizado
3. Si el problema continúa, contacta con soporte indicando:
   - Número de factura: ${numeroFactura}
   - Serie: ${serieFactura}
   - Orden ID: ${orden_id}
        `.trim()
      } else if (facturaError?.code === '23503') {
        // Foreign key violation
        mensajeUsuario = 'Error de relación: Datos vinculados no encontrados'
        sugerencia = `
POSIBLES CAUSAS:
- El cliente de la orden fue eliminado
- El taller no existe en la base de datos
- La serie de facturación tiene problemas

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

        // Calcular importes (todos los tipos con IVA normal)
        const baseImponibleLinea = cantidad * precioUnitario
        const ivaImporte = baseImponibleLinea * (ivaPorcentajeLinea / 100)
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

    // Actualizar la orden
    await supabase
      .from('ordenes_reparacion')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', orden_id)

    // La numeración ya fue actualizada ANTES de crear la factura
    // para evitar duplicados en peticiones simultáneas

    // ==================== ÉXITO ====================
    console.log(`✅ ¡FACTURA CREADA EXITOSAMENTE!`)
    console.log(`   - Número: ${numeroFactura}`)
    console.log(`   - ID: ${factura.id}`)
    console.log(`   - Cliente: ${orden.clientes.nombre}`)
    console.log(`   - Total: ${total.toFixed(2)}€`)
    console.log(`   - Líneas: ${lineasOrden?.length || 1}`)

    return NextResponse.json({
      success: true,
      id: factura.id,
      numero_factura: numeroFactura,
      message: `✅ Factura ${numeroFactura} creada correctamente`,
      datos: {
        numero: numeroFactura,
        cliente: orden.clientes.nombre,
        total: total,
        lineas: lineasOrden?.length || 1
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
