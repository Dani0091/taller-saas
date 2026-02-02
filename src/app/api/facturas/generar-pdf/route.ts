/**
 * API ENDPOINT: Generar PDF de Factura
 * * Genera un PDF profesional y descargable
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

/**
 * Descarga una imagen y la convierte a Base64 para evitar errores de CORS en el PDF
 */
async function obtenerImagenBase64(url: string): Promise<string> {
  try {
    // Si ya es base64 o no es una URL, retornamos tal cual
    if (!url.startsWith('http')) return url;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Error al descargar imagen');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/png';
    
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Error convirtiendo imagen a Base64:', error);
    // Retornamos la URL original como fallback
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

    // Obtener configuración del taller (incluye logo, CIF, colores)
    const { data: tallerConfig } = await supabase
      .from('taller_config')
      .select('*')
      .eq('taller_id', factura.taller_id)
      .single()

    // Obtener líneas
    const { data: lineas } = await supabase
      .from('detalles_factura')
      .select('*')
      .eq('factura_id', facturaId)

    // Obtener vehículo
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

    // Procesar Logo a Base64 (Solución al error del logo invisible)
    const urlOriginalLogo = tallerConfig?.logo_url || '
