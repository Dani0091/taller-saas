/**
 * API ENDPOINT: Generar Verifactu
 * 
 * Genera todos los datos necesarios para cumplir con normativa AEAT
 * - Número de verificación
 * - Hash encadenado
 * - QR
 * - XML
 * - Firma HMAC
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  generarRegistroVerifactuCompleto,
  DatosVerifactu,
} from '@/lib/verifactu/service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const {
      facturaId,
      numeroFactura,
      serieFactura,
      fechaEmision,
      nifEmisor,
      nombreEmisor,
      nifReceptor,
      nombreReceptor,
      baseImponible,
      cuotaRepercutida,
      cuotaSoportada,
      descripcion,
      formaPago = 'T', // T = Transferencia (por defecto)
    } = body

    // Validaciones
    if (!facturaId || !numeroFactura || !nifEmisor || !nifReceptor) {
      return NextResponse.json(
        { error: 'Datos requeridos incompletos' },
        { status: 400 }
      )
    }

    // Obtener el hash anterior (si existe) para encadenamiento
    let hashAnterior: string | undefined
    try {
      const { data: facturaAnterior } = await supabase
        .from('facturas')
        .select('verifactu_hash_encadenado')
        .eq('taller_id', body.tallerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (facturaAnterior?.verifactu_hash_encadenado) {
        hashAnterior = facturaAnterior.verifactu_hash_encadenado
      }
    } catch (e) {
      console.log('Primera factura o sin hash anterior')
    }

    // Preparar datos para Verifactu
    const datosVerifactu: DatosVerifactu = {
      numeroFactura,
      serieFactura,
      fechaEmision, // Debe estar en formato YYYY-MM-DD
      nifEmisor,
      nombreEmisor,
      nifReceptor,
      nombreReceptor,
      baseImponible: parseFloat(baseImponible),
      cuotaRepercutida: parseFloat(cuotaRepercutida),
      cuotaSoportada: cuotaSoportada ? parseFloat(cuotaSoportada) : undefined,
      tipoFactura: 'F1', // F1 = Factura normal
      descripcion,
      formaPago: formaPago as any,
    }

    // Generar registro Verifactu completo
    const registroVerifactu = generarRegistroVerifactuCompleto(
      datosVerifactu,
      hashAnterior
    )

    // Guardar en base de datos
    const { error: updateError } = await supabase
      .from('facturas')
      .update({
        numero_verifactu: registroVerifactu.numeroVerificacion,
        verifactu_hash: registroVerifactu.hash,
        verifactu_hash_encadenado: registroVerifactu.hashEncadenado,
        verifactu_qr: registroVerifactu.qr,
        verifactu_qr_base64: registroVerifactu.qrBase64,
        verifactu_xml: registroVerifactu.xmlCompleto,
        verifactu_firma_hmac: registroVerifactu.firmaHMAC,
        verifactu_qr_url: registroVerifactu.urlVerificacion,
        verifactu_estado: 'generado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', facturaId)

    if (updateError) {
      console.error('Error al guardar Verifactu:', updateError)
      return NextResponse.json(
        { error: 'Error al guardar datos de verificación' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      verifactu: {
        numeroVerificacion: registroVerifactu.numeroVerificacion,
        hash: registroVerifactu.hash,
        qr: registroVerifactu.qr,
        qrBase64: registroVerifactu.qrBase64,
        urlVerificacion: registroVerifactu.urlVerificacion,
        xmlCompleto: registroVerifactu.xmlCompleto,
        estado: registroVerifactu.estado,
        fechaGeneracion: registroVerifactu.fechaGeneracion,
      },
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
