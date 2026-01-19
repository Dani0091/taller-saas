/**
 * API ENDPOINT: Generar PDF de Factura
 * 
 * Genera un PDF profesional y descargable
 * con toda la información de la factura
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Traduce códigos de método de pago a texto completo
 */
function traducirMetodoPago(codigo: string | null | undefined): string {
  const traducciones: Record<string, string> = {
    'T': 'Transferencia bancaria',
    'E': 'Efectivo',
    'A': 'Tarjeta',
    'B': 'Bizum',
    'O': 'Otro'
  }
  return traducciones[codigo?.toUpperCase() || ''] || 'No especificado'
}

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

    // Obtener configuración del taller (incluye logo)
    const { data: tallerConfig } = await supabase
      .from('taller_config')
      .select('*')
      .eq('taller_id', factura.taller_id)
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

    // Construir nombre completo del cliente (incluyendo apellidos si existen)
    const nombreCompletoCliente = cliente?.apellidos
      ? `${cliente.nombre} ${cliente.apellidos}`.trim()
      : cliente?.nombre || 'Cliente'

    // Preparar datos para PDF (priorizar taller_config sobre talleres)
    const datosFactura = {
      numeroFactura: factura.numero_factura,
      serie: factura.numero_serie || '',
      fechaEmision: factura.fecha_emision,
      fechaVencimiento: factura.fecha_vencimiento,
      logoUrl: tallerConfig?.logo_url || null,
      emisor: {
        nombre: tallerConfig?.nombre_empresa || taller?.nombre || 'Taller',
        nif: tallerConfig?.cif || taller?.nif || '',
        direccion: tallerConfig?.direccion || taller?.direccion || '',
        codigoPostal: taller?.codigo_postal || '',
        ciudad: taller?.ciudad || '',
        provincia: taller?.provincia || '',
        pais: 'ESPAÑA',
        telefono: tallerConfig?.telefono || taller?.telefono,
        email: tallerConfig?.email || taller?.email,
        web: taller?.web,
      },
      receptor: {
        nombre: nombreCompletoCliente,
        nif: cliente?.nif || '',
        direccion: cliente?.direccion || '',
        codigoPostal: cliente?.codigo_postal || '',
        ciudad: cliente?.ciudad || '',
        provincia: cliente?.provincia || '',
        pais: 'ESPAÑA',
        email: cliente?.email,
        telefono: cliente?.telefono,
      },
      // Persona de contacto (puede diferir del cliente)
      personaContacto: factura.persona_contacto || null,
      telefonoContacto: factura.telefono_contacto || null,
      vehiculo,
      lineas: (lineas || []).map((l: any) => ({
        concepto: l.concepto || 'Servicio',
        descripcion: l.descripcion || l.concepto || 'Servicio',
        cantidad: l.cantidad,
        precioUnitario: l.precio_unitario,
        baseImponible: l.base_imponible || (l.cantidad * l.precio_unitario),
        ivaPercentaje: l.iva_porcentaje || 21,
        ivaImporte: l.iva_importe || 0,
        total: l.total_linea || l.importe_total || (l.cantidad * l.precio_unitario),
        tipoLinea: l.tipo_linea || 'servicio',
      })),
      baseImponible: factura.base_imponible,
      ivaPercentaje: factura.iva_porcentaje || 21,
      cuotaIVA: factura.iva,
      descuento: factura.descuento_global || 0,
      envio: 0,
      total: factura.total,
      metodoPago: traducirMetodoPago(factura.metodo_pago),
      condicionesPago: factura.condiciones_pago || tallerConfig?.condiciones_pago || null,
      notas: factura.notas_internas,
      notasLegales: tallerConfig?.notas_factura || null,
      iban: tallerConfig?.iban || null,
      // Código del método de pago para lógica condicional
      metodoPagoCodigo: factura.metodo_pago,
      verifactuNumero: factura.numero_verifactu,
      verifactuURL: factura.verifactu_qr_url,
      // Colores personalizados del taller
      colorPrimario: tallerConfig?.color_primario || '#0284c7',
      colorSecundario: tallerConfig?.color_secundario || '#0369a1',
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
