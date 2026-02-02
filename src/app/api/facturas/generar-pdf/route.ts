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

/**
 * Descarga una imagen y la convierte a Base64 para evitar errores de CORS en el PDF
 */
async function obtenerImagenBase64(url: string): Promise<string> {
  try {
    if (!url || !url.startsWith('http')) return url;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Error al descargar imagen');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/png';
    
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Error convirtiendo imagen a Base64:', error);
    return url;
  }
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

    // 1. Obtener factura
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

    // 2. Obtener datos relacionados (cliente, taller, config)
    const [clienteRes, tallerRes, configRes, lineasRes] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', factura.cliente_id).single(),
      supabase.from('talleres').select('*').eq('id', factura.taller_id).single(),
      supabase.from('taller_config').select('*').eq('taller_id', factura.taller_id).single(),
      supabase.from('detalles_factura').select('*').eq('factura_id', facturaId)
    ])

    const cliente = clienteRes.data
    const taller = tallerRes.data
    const tallerConfig = configRes.data
    const lineas = lineasRes.data

    // 3. Obtener vehículo si existe orden
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

    // 4. Procesar Logo (Base64)
    const urlOriginalLogo = tallerConfig?.logo_url || 'https://via.placeholder.com/150x80/E11D48/FFFFFF?text=R%26S';
    const logoUrlFinal = await obtenerImagenBase64(urlOriginalLogo);

    const nombreCompletoCliente = cliente?.apellidos
      ? `${cliente.nombre} ${cliente.apellidos}`.trim()
      : cliente?.nombre || 'Cliente'

    // 5. Preparar objeto de datos para el PDF
    const datosFactura = {
      numeroFactura: factura.numero_factura,
      serie: factura.numero_serie || '',
      fechaEmision: factura.fecha_emision,
      fechaVencimiento: factura.fecha_vencimiento,
      logoUrl: logoUrlFinal,
      emisor: {
        nombre: tallerConfig?.nombre_empresa || taller?.nombre || 'Taller',
        nif: tallerConfig?.cif || taller?.nif || 'B22757140',
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
      metodoPagoCodigo: factura.metodo_pago,
      estado: factura.estado,
      verifactuNumero: factura.numero_verifactu,
      verifactuURL: factura.verifactu_qr_url,
      colorPrimario: tallerConfig?.color_primario || '#E11D48',
      colorSecundario: tallerConfig?.color_secundario || '#B91C1C',
    }

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
