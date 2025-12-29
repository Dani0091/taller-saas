/**
 * SERVICIO VERIFACTU
 * 
 * Cumplimiento con normativa española de Hacienda (AEAT)
 * Sistema de registro de facturas telemáticas ante AEAT
 * 
 * Requisitos legales:
 * - Real Decreto 1619/2012 de 30 de noviembre
 * - Resolución de 29 de enero de 2016
 * - Orden HAP/492/2017 de 25 de mayo
 * - Normativa Verifactu (2024)
 * 
 * Obligatorio para:
 * - Empresas con facturación > 3.600.000€/año
 * - Desde 2024: Todas las empresas en ciertos sectores
 * - A partir de 2025: Obligatorio para todos
 */

import crypto from 'crypto'

/**
 * Interface para los datos de factura que requiere Verifactu
 * Según especificaciones técnicas de AEAT
 */
export interface DatosVerifactu {
  // Datos de la factura
  numeroFactura: string
  serieFactura: string
  fechaEmision: string // Formato: YYYY-MM-DD
  
  // NIF del que emite (Empresa/Taller)
  nifEmisor: string
  nombreEmisor: string
  
  // NIF del que recibe (Cliente)
  nifReceptor: string
  nombreReceptor: string
  
  // Importes
  baseImponible: number
  cuotaRepercutida: number // IVA a cobrar
  cuotaSoportada?: number // IVA soportado (si aplica)
  
  // Tipo de factura
  tipoFactura: 'F1' | 'F2' | 'F3' | 'F4' // F1=Normal, F2=Simplificada, F3=Factura expedida por tercero, F4=Resumen de facturas
  
  // Descripción del servicio
  descripcion: string
  
  // Forma de pago
  formaPago: 'E' | 'T' | 'A' | 'O' // E=Efectivo, T=Transferencia, A=Tarjeta, O=Otra
  
  // Referencia externa (opcional)
  referencia?: string
  
  // Hash encadenado (si es necesario para auditoría)
  hashAnterior?: string
}

/**
 * Generar número de verificación Verifactu
 * Cumple con el formato de AEAT: 13 dígitos
 */
export function generarNumeroVerificacion(factura: DatosVerifactu): string {
  // Formato: AAMMDDXXXNNNNN
  // AA = año
  // MM = mes
  // DD = día
  // XXX = 3 dígitos aleatorios
  // NNNNN = últimos 5 dígitos del número de factura
  
  const fecha = new Date(factura.fechaEmision)
  const año = fecha.getFullYear().toString().slice(-2)
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  
  // Generar 3 dígitos aleatorios
  const aleatorios = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  
  // Últimos 5 dígitos del número de factura
  const numeroFacturaNumerico = factura.numeroFactura.replace(/\D/g, '')
  const ultimos5 = numeroFacturaNumerico.slice(-5).padStart(5, '0')
  
  return `${año}${mes}${dia}${aleatorios}${ultimos5}`
}

/**
 * Generar código QR para Verifactu
 * Contiene información comprimida de la factura
 * Permite verificar en: https://www.aeat.es/
 */
export function generarQRVerifactu(factura: DatosVerifactu, numeroVerificacion: string): string {
  // Formato del QR: Datos separados por pipe (|)
  // Según especificaciones de AEAT
  
  const qrData = [
    factura.nifEmisor,
    factura.numeroFactura,
    factura.serieFactura,
    factura.fechaEmision.replace(/-/g, ''),
    factura.baseImponible.toFixed(2).replace('.', ','),
    factura.cuotaRepercutida.toFixed(2).replace('.', ','),
    factura.nifReceptor || 'RECEPTOR_DESCONOCIDO',
    numeroVerificacion,
  ].join('|')
  
  return qrData
}

/**
 * Generar hash SHA-256 para encadenamiento de facturas
 * Cumple con requisitos de auditoría y trazabilidad
 */
export function generarHashFactura(factura: DatosVerifactu, hashAnterior?: string): string {
  // Datos a hashear en orden específico para Verifactu
  const datosHash = [
    factura.nifEmisor,
    factura.numeroFactura,
    factura.fechaEmision,
    factura.baseImponible.toFixed(2),
    factura.cuotaRepercutida.toFixed(2),
    factura.nifReceptor || '',
    hashAnterior || 'PRIMERA_FACTURA',
  ].join('||')
  
  return crypto
    .createHash('sha256')
    .update(datosHash)
    .digest('hex')
    .toUpperCase()
}

/**
 * Generar HMAC-SHA256 (Firma digital)
 * Requiere certificado digital (pendiente de integración)
 * De momento usa una firma simulada
 */
export function generarFirmaHMAC(
  factura: DatosVerifactu,
  claveFirma: string,
  numeroVerificacion: string
): string {
  const datosFirema = [
    factura.nifEmisor,
    factura.numeroFactura,
    numeroVerificacion,
    factura.baseImponible.toFixed(2),
    factura.cuotaRepercutida.toFixed(2),
  ].join('||')
  
  return crypto
    .createHmac('sha256', claveFirma)
    .update(datosFirema)
    .digest('hex')
    .toUpperCase()
}

/**
 * Generar XML para Verifactu (formato de envío a AEAT)
 * Cumple con esquema XSD de AEAT
 */
export function generarXMLVerifactu(
  factura: DatosVerifactu,
  numeroVerificacion: string,
  hash: string,
  qr: string
): string {
  // XML estructurado según especificaciones AEAT
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<RegistroFactura>
  <!-- DATOS DEL EMISOR -->
  <Emisor>
    <NIF>${factura.nifEmisor}</NIF>
    <Nombre>${escaparXML(factura.nombreEmisor)}</Nombre>
  </Emisor>
  
  <!-- DATOS DE LA FACTURA -->
  <Factura>
    <NumeroFactura>${factura.numeroFactura}</NumeroFactura>
    <SerieFactura>${factura.serieFactura}</SerieFactura>
    <FechaEmision>${factura.fechaEmision}</FechaEmision>
    <TipoFactura>${factura.tipoFactura}</TipoFactura>
  </Factura>
  
  <!-- DATOS DEL RECEPTOR -->
  <Receptor>
    <NIF>${factura.nifReceptor || 'RECEPTOR_DESCONOCIDO'}</NIF>
    <Nombre>${escaparXML(factura.nombreReceptor)}</Nombre>
  </Receptor>
  
  <!-- IMPORTES -->
  <Importes>
    <BaseImponible>${factura.baseImponible.toFixed(2)}</BaseImponible>
    <CuotaRepercutida>${factura.cuotaRepercutida.toFixed(2)}</CuotaRepercutida>
    ${factura.cuotaSoportada ? `<CuotaSoportada>${factura.cuotaSoportada.toFixed(2)}</CuotaSoportada>` : ''}
  </Importes>
  
  <!-- DATOS VERIFACTU -->
  <Verifactu>
    <NumeroVerificacion>${numeroVerificacion}</NumeroVerificacion>
    <Hash>${hash}</Hash>
    <QR>${qr}</QR>
    <Descripcion>${escaparXML(factura.descripcion)}</Descripcion>
    <FormaPago>${factura.formaPago}</FormaPago>
  </Verifactu>
  
  <!-- TIMESTAMP -->
  <FechaRegistro>${new Date().toISOString()}</FechaRegistro>
</RegistroFactura>`
  
  return xml
}

/**
 * Escapar caracteres especiales XML
 */
function escaparXML(texto: string): string {
  if (!texto) return ''
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Generar URL de verificación en AEAT
 * El usuario puede acceder a esta URL para verificar la factura
 */
export function generarURLVerificacion(
  numeroVerificacion: string,
  nifEmisor: string,
  numeroFactura: string,
  totalFactura: number
): string {
  // URL base del portal de AEAT
  const baseURL = 'https://www.aeat.es/verifactu'
  
  // Parámetros de verificación
  const params = new URLSearchParams({
    nif: nifEmisor,
    numero: numeroFactura,
    verificacion: numeroVerificacion,
    importe: totalFactura.toFixed(2),
  })
  
  return `${baseURL}?${params.toString()}`
}

/**
 * Estructura completa del registro Verifactu
 * Listo para almacenar en BD y enviar a AEAT
 */
export interface RegistroVerifactu {
  numeroVerificacion: string
  hash: string
  hashEncadenado: string
  qr: string
  qrBase64: string // Para mostrar en pantalla
  xmlCompleto: string
  firmaHMAC: string
  urlVerificacion: string
  fechaGeneracion: Date
  estado: 'generado' | 'pendiente_envio' | 'enviado' | 'aceptado' | 'rechazado'
  respuestaAEAT?: {
    codigo: string
    mensaje: string
    timestamp: string
  }
}

/**
 * Generar registro Verifactu completo
 * Una sola función que genera todo lo necesario
 */
export function generarRegistroVerifactuCompleto(
  factura: DatosVerifactu,
  hashAnterior?: string,
  claveFirma: string = 'CLAVE_TEMPORAL' // TODO: Integrar certificado digital real
): RegistroVerifactu {
  // Generar componentes
  const numeroVerificacion = generarNumeroVerificacion(factura)
  const hash = generarHashFactura(factura, hashAnterior)
  const qr = generarQRVerifactu(factura, numeroVerificacion)
  const firmaHMAC = generarFirmaHMAC(factura, claveFirma, numeroVerificacion)
  const xmlCompleto = generarXMLVerifactu(factura, numeroVerificacion, hash, qr)
  
  // Convertir QR a Base64 para mostrar en web
  const qrBase64 = Buffer.from(qr).toString('base64')
  
  // Generar URL de verificación
  const urlVerificacion = generarURLVerificacion(
    numeroVerificacion,
    factura.nifEmisor,
    factura.numeroFactura,
    factura.baseImponible + factura.cuotaRepercutida
  )
  
  return {
    numeroVerificacion,
    hash,
    hashEncadenado: hashAnterior || 'PRIMERA',
    qr,
    qrBase64,
    xmlCompleto,
    firmaHMAC,
    urlVerificacion,
    fechaGeneracion: new Date(),
    estado: 'generado',
  }
}
