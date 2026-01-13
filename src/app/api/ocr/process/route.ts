import { NextRequest, NextResponse } from 'next/server'

// Configuración para evitar timeout en procesamiento de imágenes
export const maxDuration = 30

interface OCRResult {
  success: boolean
  texto: string
  confianza: number
  matricula?: string | null
  km?: number | null
  error?: string
}

// Patrones de matrículas españolas
const MATRICULA_PATTERNS = [
  /\b([0-9]{4})\s*[-]?\s*([B-DF-HJ-NP-TV-Z]{3})\b/gi,
  /\b([A-Z]{1,2})\s*[-]?\s*([0-9]{4})\s*[-]?\s*([A-Z]{2,3})\b/gi,
  /\b([A-Z]{2})\s*[-]\s*([0-9]{3,4})\s*[-]\s*([A-Z]{2,3})\b/gi,
  /\b([0-9]{4})\s*[-]?\s*([B-DF-HJ-NP-TV-Z]{2,3})\b/gi,
]

// Patrones para kilometraje
const KM_PATTERNS = [
  /\b([0-9]{1,3}(?:[.,][0-9]{3})*)\s*(?:km|kms|kilómetros|kilometros)\b/gi,
  /\bkm\s*[:=]?\s*([0-9]{1,3}(?:[.,][0-9]{3})*)\b/gi,
  /\b([0-9]{3,6})\s*(?:km|kms)\b/gi,
]

function extraerMatricula(texto: string): string | null {
  const textoLimpio = texto.toUpperCase().replace(/[^A-Z0-9\s-]/g, ' ')
  for (const pattern of MATRICULA_PATTERNS) {
    pattern.lastIndex = 0
    const match = pattern.exec(textoLimpio)
    if (match) {
      const matriculaRaw = match[0].replace(/\s+/g, '').replace(/-+/g, '')
      if (matriculaRaw.length >= 5 && matriculaRaw.length <= 10) {
        return matriculaRaw.toUpperCase()
      }
    }
  }
  return null
}

function extraerKilometraje(texto: string): number | null {
  for (const pattern of KM_PATTERNS) {
    pattern.lastIndex = 0
    const match = pattern.exec(texto)
    if (match) {
      const kmStr = match[1].replace(/[.,]/g, '')
      const km = parseInt(kmStr, 10)
      if (km >= 10 && km <= 999999) {
        return km
      }
    }
  }
  return null
}

// Usar Gemini Flash (gratis) para OCR
async function processWithGemini(imageBase64: string): Promise<OCRResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return { success: false, texto: '', confianza: 0, error: 'GEMINI_API_KEY no configurada' }
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Analiza esta imagen de un vehículo o documento. Extrae:
1. Matrícula del vehículo (formato español: 1234ABC o AB-1234-CD)
2. Kilometraje si es visible (del cuadro de mandos)
3. Cualquier otro texto relevante

Responde SOLO en este formato JSON exacto:
{"matricula": "1234ABC", "km": 123456, "texto": "texto extraído"}

Si no encuentras algo, usa null. Sin explicaciones adicionales.`
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256
          }
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error de Gemini')
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parsear JSON de la respuesta
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        success: true,
        texto: parsed.texto || responseText,
        confianza: 85,
        matricula: parsed.matricula,
        km: parsed.km
      }
    }

    // Fallback: extraer manualmente
    return {
      success: true,
      texto: responseText,
      confianza: 60,
      matricula: extraerMatricula(responseText),
      km: extraerKilometraje(responseText)
    }
  } catch (error: any) {
    console.error('Error Gemini:', error)
    return { success: false, texto: '', confianza: 0, error: error.message }
  }
}

// Fallback: usar servicio OCR gratuito alternativo
async function processWithFallback(imageBase64: string): Promise<OCRResult> {
  // Intentar con OCR.space (gratis, 25k/mes)
  const apiKey = process.env.OCR_SPACE_API_KEY

  if (!apiKey) {
    return { success: false, texto: '', confianza: 0, error: 'No hay API de OCR configurada' }
  }

  try {
    const formData = new FormData()
    formData.append('base64Image', `data:image/jpeg;base64,${imageBase64}`)
    formData.append('language', 'spa')
    formData.append('isOverlayRequired', 'false')
    formData.append('OCREngine', '2')

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'apikey': apiKey },
      body: formData
    })

    const data = await response.json()

    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage?.[0] || 'Error OCR.space')
    }

    const texto = data.ParsedResults?.[0]?.ParsedText || ''

    return {
      success: true,
      texto,
      confianza: 70,
      matricula: extraerMatricula(texto),
      km: extraerKilometraje(texto)
    }
  } catch (error: any) {
    return { success: false, texto: '', confianza: 0, error: error.message }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tipo = formData.get('tipo') as string || 'general'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Archivo requerido' },
        { status: 400 }
      )
    }

    // Convertir a base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')

    console.log(`📸 [OCR-API] Procesando imagen tipo: ${tipo}, tamaño: ${Math.round(buffer.length / 1024)}KB`)

    // Intentar con Gemini primero (mejor calidad)
    let result = await processWithGemini(base64)

    // Si falla, usar fallback
    if (!result.success) {
      console.log('🔄 [OCR-API] Gemini falló, usando fallback...')
      result = await processWithFallback(base64)
    }

    console.log(`✅ [OCR-API] Resultado:`, {
      matricula: result.matricula,
      km: result.km,
      confianza: result.confianza
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('❌ [OCR-API] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
