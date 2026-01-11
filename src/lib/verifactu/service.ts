/**
 * SERVICIO VERIFACTU - CUMPLIMIENTO NORMATIVA AEAT
 *
 * Implementación según:
 * - Real Decreto 1007/2023, de 5 de diciembre
 * - Orden HAC/1177/2024 (especificaciones técnicas)
 * - Esquemas XSD oficiales de AEAT (versión 1.0)
 *
 * Namespaces oficiales:
 * - sum: https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd
 * - sum1: https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd
 *
 * Plazos:
 * - Personas jurídicas: 1 enero 2027
 * - Personas físicas: 1 julio 2027
 */

import crypto from 'crypto'

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

/** URL oficial de cotejo QR de AEAT */
export const AEAT_QR_URL = 'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR'

/** Versión del esquema AEAT */
export const VERIFACTU_VERSION = '1.0'

/** Tipo de huella: 01 = SHA-256 */
export const TIPO_HUELLA_SHA256 = '01'

/** Información del software SIF (Sistema Informático de Facturación) */
export const SOFTWARE_SIF = {
  nombre: 'TallerSaaS',
  version: '1.0.0',
  nifFabricante: 'B12345678', // TODO: Configurar NIF real del fabricante
  nombreFabricante: 'TallerSaaS Software S.L.',
  idDispositivo: 'WEB-001',
}

/** Namespaces XML oficiales de AEAT */
export const NAMESPACES = {
  soapenv: 'http://schemas.xmlsoap.org/soap/envelope/',
  sum: 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd',
  sum1: 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd',
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Interface para los datos de factura que requiere Verifactu
 * Según especificaciones técnicas de AEAT
 */
export interface DatosVerifactu {
  // Datos de la factura
  numeroFactura: string
  serieFactura: string
  fechaEmision: string // Formato: YYYY-MM-DD
  fechaOperacion?: string // Formato: YYYY-MM-DD (si diferente a emisión)

  // NIF del que emite (Empresa/Taller)
  nifEmisor: string
  nombreEmisor: string

  // NIF del que recibe (Cliente)
  nifReceptor: string
  nombreReceptor: string

  // Importes
  baseImponible: number
  tipoImpositivo: number // Porcentaje IVA (ej: 21)
  cuotaRepercutida: number // IVA a cobrar
  cuotaSoportada?: number // IVA soportado (si aplica)
  importeTotal: number // Total factura

  // Tipo de factura según AEAT
  tipoFactura: 'F1' | 'F2' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5'
  // F1=Factura, F2=Simplificada, R1-R5=Rectificativas

  // Descripción del servicio
  descripcion: string

  // Forma de pago
  formaPago: '01' | '02' | '03' | '04' | '05'
  // 01=Efectivo, 02=Cheque, 03=Transferencia, 04=Tarjeta, 05=Domiciliación

  // Referencia externa (opcional)
  referencia?: string

  // Hash encadenado de la factura anterior
  hashAnterior?: string

  // Datos de la factura anterior para encadenamiento
  facturaAnterior?: {
    nifEmisor: string
    numSerieFactura: string
    fechaExpedicion: string
    huella: string
  }
}

// ============================================================================
// FUNCIONES DE GENERACIÓN
// ============================================================================

/**
 * Generar huella SHA-256 según especificación AEAT
 * Campos concatenados en orden específico definido en la Orden HAC/1177/2024
 *
 * Orden de campos para la huella:
 * 1. IDEmisorFactura (NIF)
 * 2. NumSerieFactura (Serie + Número)
 * 3. FechaExpedicionFactura (DD-MM-YYYY)
 * 4. TipoFactura
 * 5. CuotaTotal (con 2 decimales)
 * 6. ImporteTotal (con 2 decimales)
 * 7. Huella del registro anterior (o cadena vacía si es primera)
 * 8. FechaHoraHusoGenRegistro (ISO 8601)
 */
export function generarHuella(factura: DatosVerifactu, fechaGeneracion: Date): string {
  // Formatear fecha de expedición como DD-MM-YYYY
  const [año, mes, dia] = factura.fechaEmision.split('-')
  const fechaExpedicion = `${dia}-${mes}-${año}`

  // Formatear fecha/hora de generación en ISO 8601 con zona horaria
  const fechaHoraHuso = fechaGeneracion.toISOString()

  // Concatenar campos en orden específico
  const camposHuella = [
    factura.nifEmisor,
    `${factura.serieFactura}${factura.numeroFactura}`,
    fechaExpedicion,
    factura.tipoFactura,
    factura.cuotaRepercutida.toFixed(2),
    factura.importeTotal.toFixed(2),
    factura.facturaAnterior?.huella || '',
    fechaHoraHuso,
  ].join('&')

  // Generar hash SHA-256
  const huella = crypto
    .createHash('sha256')
    .update(camposHuella, 'utf8')
    .digest('hex')
    .toUpperCase()

  return huella
}

/**
 * Generar URL del QR para cotejo en AEAT
 * Según especificación de la Orden HAC/1177/2024
 *
 * Parámetros de la URL:
 * - nif: NIF del emisor
 * - numserie: Serie + Número de factura
 * - fecha: Fecha expedición (DD-MM-YYYY)
 * - importe: Importe total con 2 decimales
 */
export function generarURLQR(factura: DatosVerifactu): string {
  const [año, mes, dia] = factura.fechaEmision.split('-')
  const fechaExpedicion = `${dia}-${mes}-${año}`

  const params = new URLSearchParams({
    nif: factura.nifEmisor,
    numserie: `${factura.serieFactura}${factura.numeroFactura}`,
    fecha: fechaExpedicion,
    importe: factura.importeTotal.toFixed(2),
  })

  return `${AEAT_QR_URL}?${params.toString()}`
}

/**
 * Generar datos para el código QR
 * Contiene la URL completa de verificación en AEAT
 */
export function generarQRVerifactu(factura: DatosVerifactu): string {
  return generarURLQR(factura)
}

/**
 * Generar hash SHA-256 para encadenamiento (compatibilidad)
 * @deprecated Usar generarHuella() en su lugar
 */
export function generarHashFactura(factura: DatosVerifactu, hashAnterior?: string): string {
  const fechaGeneracion = new Date()

  // Simular factura anterior si hay hash anterior
  if (hashAnterior) {
    factura.facturaAnterior = {
      nifEmisor: factura.nifEmisor,
      numSerieFactura: 'ANTERIOR',
      fechaExpedicion: factura.fechaEmision,
      huella: hashAnterior,
    }
  }

  return generarHuella(factura, fechaGeneracion)
}

/**
 * Generar número de verificación Verifactu
 * Formato: AAMMDDXXXNNNNN (13 dígitos)
 */
export function generarNumeroVerificacion(factura: DatosVerifactu): string {
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

// ============================================================================
// GENERACIÓN XML SEGÚN ESQUEMA XSD DE AEAT
// ============================================================================

/**
 * Generar XML para Verifactu según esquema XSD oficial de AEAT
 * Estructura basada en SuministroLR.xsd y SuministroInformacion.xsd
 *
 * @param factura - Datos de la factura
 * @param huella - Huella SHA-256 generada
 * @param fechaGeneracion - Fecha/hora de generación del registro
 */
export function generarXMLVerifactu(
  factura: DatosVerifactu,
  huella: string,
  fechaGeneracion: Date
): string {
  // Formatear fechas
  const [año, mes, dia] = factura.fechaEmision.split('-')
  const fechaExpedicion = `${dia}-${mes}-${año}`
  const fechaHoraHuso = fechaGeneracion.toISOString()

  // Generar bloque de encadenamiento
  let encadenamientoXML = ''
  if (factura.facturaAnterior) {
    const [añoAnt, mesAnt, diaAnt] = factura.facturaAnterior.fechaExpedicion.split('-')
    encadenamientoXML = `
      <sum1:Encadenamiento>
        <sum1:RegistroAnterior>
          <sum1:IDEmisorFactura>${factura.facturaAnterior.nifEmisor}</sum1:IDEmisorFactura>
          <sum1:NumSerieFactura>${factura.facturaAnterior.numSerieFactura}</sum1:NumSerieFactura>
          <sum1:FechaExpedicionFactura>${diaAnt}-${mesAnt}-${añoAnt}</sum1:FechaExpedicionFactura>
          <sum1:Huella>${factura.facturaAnterior.huella}</sum1:Huella>
        </sum1:RegistroAnterior>
      </sum1:Encadenamiento>`
  } else {
    encadenamientoXML = `
      <sum1:Encadenamiento>
        <sum1:PrimerRegistro>S</sum1:PrimerRegistro>
      </sum1:Encadenamiento>`
  }

  // XML estructurado según especificaciones AEAT
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="${NAMESPACES.soapenv}"
                  xmlns:sum="${NAMESPACES.sum}"
                  xmlns:sum1="${NAMESPACES.sum1}">
  <soapenv:Header/>
  <soapenv:Body>
    <sum:RegFactuSistemaFacturacion>
      <!-- CABECERA -->
      <sum:Cabecera>
        <sum1:IDVersion>${VERIFACTU_VERSION}</sum1:IDVersion>
        <sum1:ObligadoEmision>
          <sum1:NombreRazon>${escaparXML(factura.nombreEmisor)}</sum1:NombreRazon>
          <sum1:NIF>${factura.nifEmisor}</sum1:NIF>
        </sum1:ObligadoEmision>
      </sum:Cabecera>

      <!-- REGISTRO DE FACTURA -->
      <sum:RegistroFactura>
        <!-- Identificación de la factura -->
        <sum1:IDFactura>
          <sum1:IDEmisorFactura>${factura.nifEmisor}</sum1:IDEmisorFactura>
          <sum1:NumSerieFactura>${factura.serieFactura}${factura.numeroFactura}</sum1:NumSerieFactura>
          <sum1:FechaExpedicionFactura>${fechaExpedicion}</sum1:FechaExpedicionFactura>
        </sum1:IDFactura>

        <!-- Datos de la factura -->
        <sum1:NombreRazonEmisor>${escaparXML(factura.nombreEmisor)}</sum1:NombreRazonEmisor>
        <sum1:TipoFactura>${factura.tipoFactura}</sum1:TipoFactura>
        <sum1:DescripcionOperacion>${escaparXML(factura.descripcion)}</sum1:DescripcionOperacion>

        <!-- Destinatario -->
        <sum1:Destinatarios>
          <sum1:IDDestinatario>
            <sum1:NombreRazon>${escaparXML(factura.nombreReceptor)}</sum1:NombreRazon>
            <sum1:NIF>${factura.nifReceptor}</sum1:NIF>
          </sum1:IDDestinatario>
        </sum1:Destinatarios>

        <!-- Desglose de factura -->
        <sum1:Desglose>
          <sum1:DetalleDesglose>
            <sum1:Impuesto>01</sum1:Impuesto><!-- 01 = IVA -->
            <sum1:ClaveRegimen>01</sum1:ClaveRegimen><!-- 01 = Régimen general -->
            <sum1:CalificacionOperacion>S1</sum1:CalificacionOperacion><!-- S1 = Sujeta y no exenta -->
            <sum1:TipoImpositivo>${factura.tipoImpositivo.toFixed(2)}</sum1:TipoImpositivo>
            <sum1:BaseImponibleOImporteNoSujeto>${factura.baseImponible.toFixed(2)}</sum1:BaseImponibleOImporteNoSujeto>
            <sum1:CuotaRepercutida>${factura.cuotaRepercutida.toFixed(2)}</sum1:CuotaRepercutida>
          </sum1:DetalleDesglose>
        </sum1:Desglose>

        <!-- Totales -->
        <sum1:CuotaTotal>${factura.cuotaRepercutida.toFixed(2)}</sum1:CuotaTotal>
        <sum1:ImporteTotal>${factura.importeTotal.toFixed(2)}</sum1:ImporteTotal>

        <!-- Encadenamiento -->
        ${encadenamientoXML}

        <!-- Sistema informático -->
        <sum1:SistemaInformatico>
          <sum1:NombreRazon>${escaparXML(SOFTWARE_SIF.nombreFabricante)}</sum1:NombreRazon>
          <sum1:NIF>${SOFTWARE_SIF.nifFabricante}</sum1:NIF>
          <sum1:NombreSistemaInformatico>${SOFTWARE_SIF.nombre}</sum1:NombreSistemaInformatico>
          <sum1:IdSistemaInformatico>${SOFTWARE_SIF.idDispositivo}</sum1:IdSistemaInformatico>
          <sum1:Version>${SOFTWARE_SIF.version}</sum1:Version>
          <sum1:NumeroInstalacion>001</sum1:NumeroInstalacion>
          <sum1:TipoUsoPosibleSoloVerifactu>S</sum1:TipoUsoPosibleSoloVerifactu>
          <sum1:TipoUsoPosibleMultiOT>N</sum1:TipoUsoPosibleMultiOT>
          <sum1:IndicadorMultiplesOT>N</sum1:IndicadorMultiplesOT>
        </sum1:SistemaInformatico>

        <!-- Fecha y hora de generación -->
        <sum1:FechaHoraHusoGenRegistro>${fechaHoraHuso}</sum1:FechaHoraHusoGenRegistro>

        <!-- Huella digital SHA-256 -->
        <sum1:TipoHuella>${TIPO_HUELLA_SHA256}</sum1:TipoHuella>
        <sum1:Huella>${huella}</sum1:Huella>
      </sum:RegistroFactura>
    </sum:RegFactuSistemaFacturacion>
  </soapenv:Body>
</soapenv:Envelope>`

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

// ============================================================================
// REGISTRO COMPLETO VERIFACTU
// ============================================================================

/**
 * Estructura completa del registro Verifactu
 * Listo para almacenar en BD y enviar a AEAT
 */
export interface RegistroVerifactu {
  // Identificadores
  numeroVerificacion: string

  // Huella digital
  huella: string
  tipoHuella: string // '01' = SHA-256
  huellaAnterior?: string

  // Código QR
  qrURL: string // URL completa para el QR
  qrBase64?: string // Imagen QR en base64 (generada por el cliente)

  // XML completo
  xmlCompleto: string

  // URL de verificación en AEAT
  urlVerificacion: string

  // Frase obligatoria para facturas
  fraseVerifactu: string

  // Metadata
  fechaGeneracion: Date
  fechaHoraHuso: string // ISO 8601

  // Estado del registro
  estado: 'generado' | 'pendiente_envio' | 'enviado' | 'aceptado' | 'rechazado'

  // Respuesta de AEAT (cuando se envía)
  respuestaAEAT?: {
    codigo: string
    mensaje: string
    timestamp: string
    csv?: string // Código Seguro de Verificación
  }

  // Info del software
  software: {
    nombre: string
    version: string
    nifFabricante: string
  }
}

/** Frase obligatoria para facturas VERI*FACTU */
export const FRASE_VERIFACTU = 'Factura verificable en la sede electrónica de la AEAT'
export const FRASE_VERIFACTU_CORTA = 'VERI*FACTU'

/**
 * Generar registro Verifactu completo
 * Una sola función que genera todo lo necesario según normativa AEAT
 */
export function generarRegistroVerifactuCompleto(
  factura: DatosVerifactu,
  facturaAnterior?: {
    nifEmisor: string
    numSerieFactura: string
    fechaExpedicion: string
    huella: string
  }
): RegistroVerifactu {
  const fechaGeneracion = new Date()

  // Asignar factura anterior si existe
  if (facturaAnterior) {
    factura.facturaAnterior = facturaAnterior
  }

  // Generar huella SHA-256
  const huella = generarHuella(factura, fechaGeneracion)

  // Generar número de verificación
  const numeroVerificacion = generarNumeroVerificacion(factura)

  // Generar URL del QR (para cotejo en AEAT)
  const qrURL = generarURLQR(factura)

  // Generar XML completo según esquema AEAT
  const xmlCompleto = generarXMLVerifactu(factura, huella, fechaGeneracion)

  return {
    numeroVerificacion,
    huella,
    tipoHuella: TIPO_HUELLA_SHA256,
    huellaAnterior: facturaAnterior?.huella,
    qrURL,
    xmlCompleto,
    urlVerificacion: qrURL, // La URL del QR es la misma que la de verificación
    fraseVerifactu: FRASE_VERIFACTU,
    fechaGeneracion,
    fechaHoraHuso: fechaGeneracion.toISOString(),
    estado: 'generado',
    software: {
      nombre: SOFTWARE_SIF.nombre,
      version: SOFTWARE_SIF.version,
      nifFabricante: SOFTWARE_SIF.nifFabricante,
    },
  }
}

// ============================================================================
// COMPATIBILIDAD CON VERSIONES ANTERIORES
// ============================================================================

/**
 * @deprecated Usar generarURLQR() en su lugar
 */
export function generarURLVerificacion(
  _numeroVerificacion: string,
  nifEmisor: string,
  numeroFactura: string,
  totalFactura: number
): string {
  // Crear objeto mínimo para compatibilidad
  const facturaMini: DatosVerifactu = {
    nifEmisor,
    nombreEmisor: '',
    nifReceptor: '',
    nombreReceptor: '',
    numeroFactura,
    serieFactura: '',
    fechaEmision: new Date().toISOString().split('T')[0],
    baseImponible: totalFactura / 1.21,
    tipoImpositivo: 21,
    cuotaRepercutida: totalFactura - totalFactura / 1.21,
    importeTotal: totalFactura,
    tipoFactura: 'F1',
    descripcion: '',
    formaPago: '03',
  }
  return generarURLQR(facturaMini)
}
