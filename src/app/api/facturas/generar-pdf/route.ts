/**
 * API ENDPOINT: Generar PDF de Factura
 * 
 * Genera un PDF profesional y descargable
 * con toda la información de la factura
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const facturaId = request.nextUrl.searchParams.get('id')

    if (!facturaId) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      )
    }

    // Obtener factura con relaciones
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .select('*')
      .eq('id', facturaId)
      .single()

    if (facturaError || !factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    // Obtener cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', factura.cliente_id)
      .single()

    // Obtener taller/emisor
    const { data: taller } = await supabase
      .from('talleres')
      .select('*')
      .eq('id', factura.taller_id)
      .single()

    // Obtener líneas
    const { data: lineas } = await supabase
      .from('lineas_factura')
      .select('*')
      .eq('factura_id', facturaId)

    // Obtener vehículo (si existe orden)
    let vehiculo = null
    if (factura.orden_id) {
      const { data: orden } = await supabase
        .from('ordenes_reparacion')
        .select('*, vehiculos(*)')
        .eq('id', factura.orden_id)
        .single()

      if (orden?.vehiculos) {
        vehiculo = {
          modelo: `${orden.vehiculos.marca} ${orden.vehiculos.modelo}`,
          matricula: orden.vehiculos.matricula,
          km: orden.vehiculos.km_actual,
          vin: orden.vehiculos.vin,
        }
      }
    }

    // Preparar datos para PDF
    const datosFactura = {
      numeroFactura: factura.numero_factura,
      serie: factura.numero_serie || 'FA',
      fechaEmision: factura.fecha_emision,
      fechaVencimiento: factura.fecha_vencimiento,
      emisor: {
        nombre: taller?.nombre || 'Taller',
        nif: taller?.nif || '',
        direccion: taller?.direccion || '',
        codigoPostal: taller?.codigo_postal || '',
        ciudad: taller?.ciudad || '',
        provincia: taller?.provincia || '',
        pais: 'ESPAÑA',
        telefono: taller?.telefono,
        email: taller?.email,
        web: taller?.web,
      },
      receptor: {
        nombre: cliente?.nombre || 'Cliente',
        nif: cliente?.nif || '',
        direccion: cliente?.direccion || '',
        codigoPostal: cliente?.codigo_postal || '',
        ciudad: cliente?.ciudad || '',
        provincia: cliente?.provincia || '',
        pais: 'ESPAÑA',
        email: cliente?.email,
        telefono: cliente?.telefono,
      },
      vehiculo,
      lineas: (lineas || []).map((l: any) => ({
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precioUnitario: l.precio_unitario,
        total: l.cantidad * l.precio_unitario,
      })),
      baseImponible: factura.base_imponible,
      ivaPercentaje: factura.iva_porcentaje || 21,
      cuotaIVA: factura.iva,
      descuento: factura.descuento_global || 0,
      envio: 0,
      total: factura.total,
      metodoPago: factura.metodo_pago,
      condicionesPago: factura.condiciones_pago || 'Pago a la vista',
      notas: factura.notas_internas,
      verifactuNumero: factura.numero_verifactu,
      verifactuURL: factura.verifactu_qr_url,
    }

    // Retornar datos como JSON para que el cliente genere el PDF
    // (alternativa a generar en servidor)
    return NextResponse.json({
      success: true,
      datos: datosFactura,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error al generar PDF' },
      { status: 500 }
    )
  }
}
