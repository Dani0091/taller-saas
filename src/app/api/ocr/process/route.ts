/**
 * API ROUTE: PROCESAMIENTO OCR/IA DE DOCUMENTOS
 *
 * Procesa imágenes de documentos (albaranes, facturas, etc.)
 * Usa servicios gratuitos con rotación automática:
 * - Tesseract.js (servidor)
 * - Google Gemini (API gratuita)
 * - OpenRouter (modelos gratuitos)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Tipos para la respuesta
interface OCRResult {
  success: boolean
  texto?: string
  datos?: {
    proveedor?: string
    numero_documento?: string
    fecha?: string
    total?: number
    iva?: number
    base_imponible?: number
    lineas?: Array<{
      descripcion: string
      cantidad?: number
      precio_unitario?: number
      total?: number
    }>
    matricula?: string
    km?: number
  }
  servicio?: string
  confianza?: number
  error?: string
}

// Patrones de extracción
const PATTERNS = {
  // Números de documento
  factura: /(?:factura|fra|fac)[:\s#nº°]*([A-Z0-9\-\/]+)/gi,
  albaran: /(?:albarán|albaran|alb)[:\s#nº°]*([A-Z0-9\-\/]+)/gi,

  // Fechas (dd/mm/yyyy, dd-mm-yyyy, etc.)
  fecha: /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g,

  // Importes
  total: /(?:total|importe|a pagar)[:\s]*([€$]?\s*[\d.,]+)\s*(?:€|eur)?/gi,
  iva: /(?:iva|i\.v\.a\.?)[:\s]*(\d+(?:[.,]\d+)?)\s*%?/gi,
  base: /(?:base\s*imponible|subtotal)[:\s]*([€$]?\s*[\d.,]+)/gi,

  // Matrículas españolas
  matricula: /\b([0-9]{4})\s*[-]?\s*([B-DF-HJ-NP-TV-Z]{3})\b/gi,

  // Kilometraje
  km: /\b([0-9]{1,3}(?:[.,][0-9]{3})*)\s*(?:km|kms)\b/gi,

  // NIF/CIF
  nif: /\b([A-Z]?\d{7,8}[A-Z])\b/gi,
}

/**
 * Extrae datos estructurados del texto OCR
 */
function extraerDatosDeTexto(texto: string): OCRResult['datos'] {
  const datos: OCRResult['datos'] = {}

  // Extraer número de documento
  let match = PATTERNS.factura.exec(texto)
  if (match) datos.numero_documento = match[1]

  if (!datos.numero_documento) {
    PATTERNS.albaran.lastIndex = 0
    match = PATTERNS.albaran.exec(texto)
    if (match) datos.numero_documento = match[1]
  }

  // Extraer fecha
  PATTERNS.fecha.lastIndex = 0
  match = PATTERNS.fecha.exec(texto)
  if (match) {
    const [, dia, mes, anio] = match
    const anioFull = anio.length === 2 ? `20${anio}` : anio
    datos.fecha = `${anioFull}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  // Extraer total
  PATTERNS.total.lastIndex = 0
  match = PATTERNS.total.exec(texto)
  if (match) {
    const valorStr = match[1].replace(/[€$\s]/g, '').replace(',', '.')
    datos.total = parseFloat(valorStr)
  }

  // Extraer IVA
  PATTERNS.iva.lastIndex = 0
  match = PATTERNS.iva.exec(texto)
  if (match) {
    datos.iva = parseFloat(match[1].replace(',', '.'))
  }

  // Extraer base imponible
  PATTERNS.base.lastIndex = 0
  match = PATTERNS.base.exec(texto)
  if (match) {
    const valorStr = match[1].replace(/[€$\s]/g, '').replace(',', '.')
    datos.base_imponible = parseFloat(valorStr)
  }

  // Extraer matrícula
  PATTERNS.matricula.lastIndex = 0
  match = PATTERNS.matricula.exec(texto)
  if (match) {
    datos.matricula = `${match[1]}${match[2]}`.toUpperCase()
  }

  // Extraer kilometraje
  PATTERNS.km.lastIndex = 0
  match = PATTERNS.km.exec(texto)
  if (match) {
    datos.km = parseInt(match[1].replace(/[.,]/g, ''), 10)
  }

  return datos
}

/**
 * Procesa con Tesseract.js en el servidor
 * (Fallback principal - 100% gratuito)
 */
async function procesarConTesseract(imageBase64: string): Promise<OCRResult> {
  try {
    // Importar Tesseract dinámicamente para evitar problemas de SSR
    const Tesseract = await import('tesseract.js')

    const result = await Tesseract.recognize(
      `data:image/jpeg;base64,${imageBase64}`,
      'spa+eng',
      {
        logger: (m) => console.log(`[Tesseract] ${m.status}: ${Math.round((m.progress || 0) * 100)}%`)
      }
    )

    const texto = result.data.text
    const datos = extraerDatosDeTexto(texto)

    return {
      success: true,
      texto,
      datos,
      servicio: 'tesseract',
      confianza: result.data.confidence
    }
  } catch (error: any) {
    console.error('[Tesseract Error]', error)
    return {
      success: false,
      error: error.message,
      servicio: 'tesseract'
    }
  }
}

/**
 * Procesa con Google Gemini (API gratuita)
 */
async function procesarConGemini(imageBase64: string, tipoDoc: string): Promise<OCRResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return { success: false, error: 'GEMINI_API_KEY no configurada', servicio: 'gemini' }
  }

  try {
    const prompt = `Analiza esta imagen de un ${tipoDoc} y extrae la siguiente información en formato JSON:
    - numero_documento: número de factura/albarán
    - fecha: en formato YYYY-MM-DD
    - proveedor: nombre del proveedor
    - total: importe total (solo número)
    - iva: porcentaje de IVA (solo número)
    - base_imponible: base imponible (solo número)
    - lineas: array de objetos con {descripcion, cantidad, precio_unitario, total}
    - matricula: si aparece alguna matrícula de vehículo
    - km: kilometraje si aparece

    Responde SOLO con el JSON, sin explicaciones.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }]
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Extraer JSON de la respuesta
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const datos = JSON.parse(jsonMatch[0])
      return {
        success: true,
        texto: textResponse,
        datos,
        servicio: 'gemini',
        confianza: 90
      }
    }

    // Si no hay JSON, usar extracción de patrones
    const datos = extraerDatosDeTexto(textResponse)
    return {
      success: true,
      texto: textResponse,
      datos,
      servicio: 'gemini',
      confianza: 70
    }
  } catch (error: any) {
    console.error('[Gemini Error]', error)
    return { success: false, error: error.message, servicio: 'gemini' }
  }
}

/**
 * Procesa con OpenRouter (modelos gratuitos)
 */
async function procesarConOpenRouter(imageBase64: string, tipoDoc: string): Promise<OCRResult> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return { success: false, error: 'OPENROUTER_API_KEY no configurada', servicio: 'openrouter' }
  }

  try {
    // Usar modelo gratuito de OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://talleragil.com',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free', // Modelo gratuito
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza esta imagen de un ${tipoDoc}. Extrae: numero_documento, fecha (YYYY-MM-DD), proveedor, total, iva, base_imponible, lineas (array), matricula, km. Responde SOLO JSON.`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            }
          ]
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`)
    }

    const data = await response.json()
    const textResponse = data.choices?.[0]?.message?.content || ''

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const datos = JSON.parse(jsonMatch[0])
      return {
        success: true,
        texto: textResponse,
        datos,
        servicio: 'openrouter',
        confianza: 85
      }
    }

    return {
      success: true,
      texto: textResponse,
      datos: extraerDatosDeTexto(textResponse),
      servicio: 'openrouter',
      confianza: 65
    }
  } catch (error: any) {
    console.error('[OpenRouter Error]', error)
    return { success: false, error: error.message, servicio: 'openrouter' }
  }
}

/**
 * POST /api/ocr/process
 * Procesa documento con OCR/IA
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener datos
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const imageUrl = formData.get('imageUrl') as string | null
    const tipoDocumento = (formData.get('tipo') as string) || 'documento'
    const servicioPreferido = formData.get('servicio') as string | null

    // Obtener imagen en base64
    let imageBase64: string

    if (file) {
      const bytes = await file.arrayBuffer()
      imageBase64 = Buffer.from(bytes).toString('base64')
    } else if (imageUrl) {
      // Descargar imagen desde URL
      const imgResponse = await fetch(imageUrl)
      const imgBuffer = await imgResponse.arrayBuffer()
      imageBase64 = Buffer.from(imgBuffer).toString('base64')
    } else {
      return NextResponse.json(
        { error: 'Se requiere file o imageUrl' },
        { status: 400 }
      )
    }

    // Orden de servicios a probar
    const servicios = servicioPreferido
      ? [servicioPreferido]
      : ['gemini', 'openrouter', 'tesseract']

    let resultado: OCRResult = { success: false, error: 'Ningún servicio disponible' }

    // Intentar con cada servicio hasta que uno funcione
    for (const servicio of servicios) {
      console.log(`[OCR] Intentando con ${servicio}...`)

      switch (servicio) {
        case 'gemini':
          resultado = await procesarConGemini(imageBase64, tipoDocumento)
          break
        case 'openrouter':
          resultado = await procesarConOpenRouter(imageBase64, tipoDocumento)
          break
        case 'tesseract':
        default:
          resultado = await procesarConTesseract(imageBase64)
          break
      }

      if (resultado.success) {
        console.log(`[OCR] ✅ Éxito con ${servicio}`)
        break
      }

      console.log(`[OCR] ❌ Falló ${servicio}: ${resultado.error}`)
    }

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error('[OCR API Error]', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error procesando documento' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ocr/process
 * Devuelve información sobre el servicio OCR
 */
export async function GET() {
  return NextResponse.json({
    servicios: [
      { id: 'gemini', nombre: 'Google Gemini', disponible: !!process.env.GEMINI_API_KEY },
      { id: 'openrouter', nombre: 'OpenRouter', disponible: !!process.env.OPENROUTER_API_KEY },
      { id: 'tesseract', nombre: 'Tesseract.js', disponible: true }
    ],
    tiposDocumento: ['albaran', 'factura', 'presupuesto', 'ficha_tecnica', 'otro']
  })
}
