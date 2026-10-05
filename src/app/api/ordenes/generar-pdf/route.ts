/**
 * API ENDPOINT: Generar PDF de Orden de Trabajo
 *
 * Genera los datos para un PDF profesional de orden de trabajo
 * similar al formulario físico del taller
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const ordenId = request.nextUrl.searchParams.get('id')

    if (!ordenId) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      )
    }

    // Obtener orden con todas las relaciones
    const { data: orden, error: ordenError } = await supabase
      .from('ordenes_reparacion')
      .select('*')
      .eq('id', ordenId)
      .single()

    if (ordenError || !orden) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Obtener cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', orden.cliente_id)
      .single()

    // Obtener vehículo
    const { data: vehiculo } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('id', orden.vehiculo_id)
      .single()

    // Obtener taller
    const { data: taller } = await supabase
      .from('talleres')
      .select('*')
      .eq('id', orden.taller_id)
      .single()

    // Obtener configuración del taller
    const { data: tallerConfig } = await supabase
      .from('taller_config')
      .select('*')
      .eq('taller_id', orden.taller_id)
      .single()

    // Obtener líneas de la orden
    const { data: lineas } = await supabase
      .from('lineas_orden')
      .select('*')
      .eq('orden_id', ordenId)
      .order('created_at')

    // Obtener % IVA del taller (fallback si una línea no trae el suyo propio)
    const { data: tallerIvaConfig } = await supabase
      .from('taller_config')
      .select('porcentaje_iva')
      .eq('taller_id', orden.taller_id)
      .maybeSingle()

    // Totales EN VIVO desde las líneas — igual que calcular-totales-orden.action.ts y el
    // presupuesto público. orden.subtotal_mano_obra/iva_amount/total_con_iva son columnas
    // cacheadas que solo se refrescan en un autosave general; si se añaden líneas sin tocar
    // otro campo del formulario, el PDF mostraba un total desincronizado de la tabla de líneas.
    const porcentajeIvaTaller = tallerIvaConfig?.porcentaje_iva || 21
    // El % de IVA de la ORDEN (toggle "Aplicar IVA") manda — salvo suplidos, siempre 0%.
    const ivaPorcentajeOrden = orden.iva_porcentaje ?? porcentajeIvaTaller
    const totalesCalculados = (lineas || []).reduce(
      (acc: any, l: any) => {
        const subtotalLinea = l.cantidad * l.precio_unitario
        const ivaPorcentajeLinea = l.tipo === 'suplido' ? 0 : ivaPorcentajeOrden
        const ivaLinea = subtotalLinea * (ivaPorcentajeLinea / 100)
        return {
          manoObra: l.tipo === 'mano_obra' ? acc.manoObra + subtotalLinea : acc.manoObra,
          piezas: l.tipo === 'pieza' ? acc.piezas + subtotalLinea : acc.piezas,
          subtotal: acc.subtotal + subtotalLinea,
          iva: acc.iva + ivaLinea,
          total: acc.total + subtotalLinea + ivaLinea,
        }
      },
      { manoObra: 0, piezas: 0, subtotal: 0, iva: 0, total: 0 }
    )

    // Preparar datos para PDF de orden de trabajo
    const datosOrden = {
      // Datos del taller
      taller: {
        nombre: tallerConfig?.nombre_taller || tallerConfig?.nombre_empresa || taller?.nombre || 'Taller',
        cif: tallerConfig?.cif || taller?.cif || '',
        direccion: tallerConfig?.direccion || taller?.direccion || '',
        telefono: tallerConfig?.telefono || taller?.telefono || '',
        email: tallerConfig?.email || taller?.email || '',
        logoUrl: tallerConfig?.logo_url || null,
      },

      // Datos de la orden
      orden: {
        numero: orden.numero_orden,
        estado: orden.estado,
        fechaEntrada: orden.fecha_entrada,
        fechaSalidaEstimada: orden.fecha_salida_estimada,
        fechaSalidaReal: orden.fecha_salida_real,
        descripcionProblema: orden.descripcion_problema,
        diagnostico: orden.diagnostico,
        trabajosRealizados: orden.trabajos_realizados,
        notas: orden.notas,
        tiempoEstimado: orden.tiempo_estimado_horas,
        tiempoReal: orden.tiempo_real_horas,
      },

      // Datos del cliente
      cliente: {
        nombre: cliente?.nombre || '',
        apellidos: cliente?.apellidos || '',
        nif: cliente?.nif || '',
        direccion: cliente?.direccion || '',
        ciudad: cliente?.ciudad || '',
        codigoPostal: cliente?.codigo_postal || '',
        telefono: cliente?.telefono || '',
        email: cliente?.email || '',
      },

      // Datos del vehículo
      vehiculo: {
        marca: vehiculo?.marca || '',
        modelo: vehiculo?.modelo || '',
        matricula: vehiculo?.matricula || '',
        año: vehiculo?.año || null,
        color: vehiculo?.color || '',
        kilometros: vehiculo?.kilometros || orden.kilometros_entrada || null,
        tipoCombustible: vehiculo?.tipo_combustible || '',
        vin: vehiculo?.vin || vehiculo?.bastidor_vin || '',
      },

      // Campos legales del formulario
      legal: {
        nivelCombustible: orden.nivel_combustible || '',
        renunciaPresupuesto: orden.renuncia_presupuesto || false,
        accionImprevisto: orden.accion_imprevisto || 'avisar',
        recogerPiezas: orden.recoger_piezas || false,
        danosCarroceria: orden.danos_carroceria || '',
        costeDiarioEstancia: orden.coste_diario_estancia || null,
        kilometrosEntrada: orden.kilometros_entrada || null,
        presupuestoAprobado: orden.presupuesto_aprobado_por_cliente || false,
      },

      // Líneas de trabajo/repuestos
      lineas: (lineas || []).map((l: any) => ({
        tipo: l.tipo,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        horas: l.horas,
        precioUnitario: l.precio_unitario,
        total: l.importe_total || (l.cantidad * l.precio_unitario),
      })),

      // Totales
      totales: {
        subtotalManoObra: totalesCalculados.manoObra,
        subtotalPiezas: totalesCalculados.piezas,
        iva: totalesCalculados.iva,
        total: totalesCalculados.total,
      },
    }

    return NextResponse.json({
      success: true,
      datos: datosOrden,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error al generar datos de orden' },
      { status: 500 }
    )
  }
}
