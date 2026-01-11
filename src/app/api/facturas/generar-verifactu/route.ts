/**
 * API ENDPOINT: Generar Verifactu
 *
 * Genera todos los datos necesarios para cumplir con normativa AEAT:
 * - Huella SHA-256 con encadenamiento
 * - URL QR para cotejo en AEAT
 * - XML según esquema XSD oficial
 * - Información del software SIF
 *
 * Basado en:
 * - Real Decreto 1007/2023
 * - Orden HAC/1177/2024
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  generarRegistroVerifactuCompleto,
  DatosVerifactu,
  FRASE_VERIFACTU,
} from '@/lib/verifactu/service'

// Mapeo de formas de pago a códigos AEAT
const FORMAS_PAGO_MAP: Record<string, '01' | '02' | '03' | '04' | '05'> = {
  E: '01', // Efectivo
  efectivo: '01',
  T: '03', // Transferencia
  transferencia: '03',
  A: '04', // Tarjeta
  tarjeta: '04',
  O: '05', // Domiciliación/Otra
  domiciliacion: '05',
}

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
      tipoImpositivo = 21, // IVA por defecto 21%
      cuotaRepercutida,
      importeTotal,
      descripcion,
      formaPago = 'transferencia',
      tallerId,
    } = body

    // Validaciones
    if (!facturaId || !numeroFactura || !nifEmisor) {
      return NextResponse.json(
        { error: 'Datos requeridos incompletos: facturaId, numeroFactura, nifEmisor' },
        { status: 400 }
      )
    }

    // Obtener la factura anterior para encadenamiento
    let facturaAnterior: {
      nifEmisor: string
      numSerieFactura: string
      fechaExpedicion: string
      huella: string
    } | undefined

    try {
      const { data: facturaAnteriorData } = await supabase
        .from('facturas')
        .select('verifactu_huella, numero, serie, fecha_emision')
        .eq('taller_id', tallerId)
        .not('verifactu_huella', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (facturaAnteriorData?.verifactu_huella) {
        facturaAnterior = {
          nifEmisor: nifEmisor,
          numSerieFactura: `${facturaAnteriorData.serie || ''}${facturaAnteriorData.numero}`,
          fechaExpedicion: facturaAnteriorData.fecha_emision,
          huella: facturaAnteriorData.verifactu_huella,
        }
      }
    } catch {
      console.log('Primera factura VERI*FACTU o sin huella anterior')
    }

    // Calcular importeTotal si no viene
    const base = parseFloat(baseImponible)
    const cuota = parseFloat(cuotaRepercutida)
    const total = importeTotal ? parseFloat(importeTotal) : base + cuota

    // Preparar datos para Verifactu según nueva estructura
    const datosVerifactu: DatosVerifactu = {
      numeroFactura,
      serieFactura: serieFactura || '',
      fechaEmision, // Formato YYYY-MM-DD
      nifEmisor,
      nombreEmisor,
      nifReceptor: nifReceptor || '',
      nombreReceptor: nombreReceptor || 'Cliente general',
      baseImponible: base,
      tipoImpositivo: parseFloat(tipoImpositivo.toString()),
      cuotaRepercutida: cuota,
      importeTotal: total,
      tipoFactura: nifReceptor ? 'F1' : 'F2', // F1=Normal, F2=Simplificada (sin NIF receptor)
      descripcion: descripcion || 'Servicios de taller mecánico',
      formaPago: FORMAS_PAGO_MAP[formaPago] || '03',
    }

    // Generar registro Verifactu completo
    const registroVerifactu = generarRegistroVerifactuCompleto(
      datosVerifactu,
      facturaAnterior
    )

    // Guardar en base de datos
    const { error: updateError } = await supabase
      .from('facturas')
      .update({
        numero_verifactu: registroVerifactu.numeroVerificacion,
        verifactu_huella: registroVerifactu.huella,
        verifactu_tipo_huella: registroVerifactu.tipoHuella,
        verifactu_huella_anterior: registroVerifactu.huellaAnterior || null,
        verifactu_qr_url: registroVerifactu.qrURL,
        verifactu_xml: registroVerifactu.xmlCompleto,
        verifactu_frase: FRASE_VERIFACTU,
        verifactu_fecha_generacion: registroVerifactu.fechaHoraHuso,
        verifactu_estado: 'generado',
        verifactu_software_nombre: registroVerifactu.software.nombre,
        verifactu_software_version: registroVerifactu.software.version,
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
        huella: registroVerifactu.huella,
        tipoHuella: registroVerifactu.tipoHuella,
        qrURL: registroVerifactu.qrURL,
        urlVerificacion: registroVerifactu.urlVerificacion,
        fraseVerifactu: registroVerifactu.fraseVerifactu,
        xmlCompleto: registroVerifactu.xmlCompleto,
        estado: registroVerifactu.estado,
        fechaGeneracion: registroVerifactu.fechaGeneracion,
        software: registroVerifactu.software,
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
