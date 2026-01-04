'use client'

import Tesseract from 'tesseract.js'
import { preprocessImage, analyzeImageQuality } from './image-preprocessor'

let workerInstance: any = null
let initializingPromise: any = null

/**
 * Patrones de matrículas españolas
 * - Nuevo formato (desde 2000): 1234 ABC (4 números + 3 letras)
 * - Formato antiguo: M-1234-AB (provincia + números + letras)
 * - Especiales: E-1234-ABC (diplomáticos, etc.)
 */
const MATRICULA_PATTERNS = [
  // Nuevo formato: 1234 ABC o 1234ABC
  /\b([0-9]{4})\s*[-]?\s*([B-DF-HJ-NP-TV-Z]{3})\b/gi,
  // Formato antiguo con provincia: M 1234 AB o M-1234-AB
  /\b([A-Z]{1,2})\s*[-]?\s*([0-9]{4})\s*[-]?\s*([A-Z]{2,3})\b/gi,
  // Formato con guiones: AB-1234-CD
  /\b([A-Z]{2})\s*[-]\s*([0-9]{3,4})\s*[-]\s*([A-Z]{2,3})\b/gi,
  // Motos y remolques: 1234 AB
  /\b([0-9]{4})\s*[-]?\s*([B-DF-HJ-NP-TV-Z]{2,3})\b/gi,
]

/**
 * Patrones para detectar kilometraje
 */
const KM_PATTERNS = [
  /\b([0-9]{1,3}(?:[.,][0-9]{3})*)\s*(?:km|kms|kilómetros|kilometros)\b/gi,
  /\bkm\s*[:=]?\s*([0-9]{1,3}(?:[.,][0-9]{3})*)\b/gi,
  /\b([0-9]{3,6})\s*(?:km|kms)\b/gi,
]

async function initializeWorker() {
  if (!workerInstance && !initializingPromise) {
    initializingPromise = (async () => {
      console.log('⏳ [TESSERACT] Inicializando worker...')
      try {
        // Usar español + inglés para mejor cobertura
        workerInstance = await Tesseract.createWorker('spa+eng', 1, {
          corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5/tesseract-core.wasm.js'
        })
        // Configurar para mejor reconocimiento de placas
        await workerInstance.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
        })
        console.log('✅ [TESSERACT] Worker listo con optimizaciones')
        return workerInstance
      } catch (error) {
        console.error('❌ [TESSERACT] Error:', error)
        initializingPromise = null
        throw error
      }
    })()
  }

  if (initializingPromise) {
    return await initializingPromise
  }

  return workerInstance
}

/**
 * Extrae matrícula del texto usando múltiples patrones
 */
function extraerMatricula(texto: string): string | null {
  const textoLimpio = texto.toUpperCase().replace(/[^A-Z0-9\s-]/g, ' ')

  for (const pattern of MATRICULA_PATTERNS) {
    pattern.lastIndex = 0 // Reset regex
    const match = pattern.exec(textoLimpio)
    if (match) {
      // Formatear matrícula detectada
      const matriculaRaw = match[0].replace(/\s+/g, '').replace(/-+/g, '')

      // Validar que parece una matrícula real
      if (matriculaRaw.length >= 5 && matriculaRaw.length <= 10) {
        // Formatear bonito: 1234ABC o AB1234CD
        return matriculaRaw.toUpperCase()
      }
    }
  }

  return null
}

/**
 * Extrae kilometraje del texto
 */
function extraerKilometraje(texto: string): number | null {
  for (const pattern of KM_PATTERNS) {
    pattern.lastIndex = 0
    const match = pattern.exec(texto)
    if (match) {
      // Limpiar número (quitar puntos de miles, comas)
      const kmStr = match[1].replace(/[.,]/g, '')
      const km = parseInt(kmStr, 10)

      // Validar rango razonable (10 - 999999 km)
      if (km >= 10 && km <= 999999) {
        return km
      }
    }
  }

  return null
}

export interface OCROptions {
  preprocess?: boolean
  adaptivePreprocess?: boolean
  retryOnLowConfidence?: boolean
}

export async function extraerDatosDeImagen(
  imagenUrl: string,
  options: OCROptions = { preprocess: true, adaptivePreprocess: true, retryOnLowConfidence: true }
) {
  try {
    console.log('📸 [TESSERACT] Procesando imagen...')

    let imagenProcesada = imagenUrl

    // Preprocesar imagen para mejores resultados
    if (options.preprocess) {
      try {
        if (options.adaptivePreprocess) {
          // Analizar imagen y usar configuración adaptativa
          const analysis = await analyzeImageQuality(imagenUrl)
          console.log('📊 [TESSERACT] Análisis:', analysis)
          imagenProcesada = await preprocessImage(imagenUrl, analysis.recommendedOptions)
        } else {
          // Preprocesamiento estándar
          imagenProcesada = await preprocessImage(imagenUrl)
        }
        console.log('🔧 [TESSERACT] Imagen preprocesada')
      } catch (prepError) {
        console.warn('⚠️ [TESSERACT] Error en preproceso, usando original:', prepError)
      }
    }

    const worker = await initializeWorker()

    console.log('🔍 [TESSERACT] Reconociendo texto...')
    const result = await worker.recognize(imagenProcesada)

    let texto = result.data.text || ''
    let confianza = result.data.confidence || 0

    console.log('📝 [TESSERACT] Texto extraído:', texto.substring(0, 150))

    // Si confianza es baja y tenemos retry habilitado, intentar con más contraste
    if (confianza < 50 && options.retryOnLowConfidence && options.preprocess) {
      console.log('🔄 [TESSERACT] Reintentando con más contraste...')
      try {
        const imagenAltoContraste = await preprocessImage(imagenUrl, {
          grayscale: true,
          contrast: 2.0,
          brightness: 1.2,
          threshold: 128, // Binarización
          sharpen: true
        })

        const retryResult = await worker.recognize(imagenAltoContraste)

        if (retryResult.data.confidence > confianza) {
          texto = retryResult.data.text || texto
          confianza = retryResult.data.confidence
          console.log('✅ [TESSERACT] Retry mejoró confianza:', confianza)
        }
      } catch (retryError) {
        console.warn('⚠️ [TESSERACT] Error en retry:', retryError)
      }
    }

    // Extraer datos estructurados
    const matricula = extraerMatricula(texto)
    const km = extraerKilometraje(texto)

    console.log('✅ [TESSERACT] Completado:', { matricula, km, confianza: Math.round(confianza) })

    return {
      success: true,
      texto,
      confianza: Math.round(confianza),
      matricula,
      km
    }
  } catch (error: any) {
    console.error('❌ [TESSERACT] Error:', error.message)
    return {
      success: false,
      error: error.message,
      texto: '',
      confianza: 0,
      matricula: null,
      km: null
    }
  }
}

export async function terminarWorker() {
  if (workerInstance) {
    console.log('🛑 [TESSERACT] Terminando worker...')
    await workerInstance.terminate()
    workerInstance = null
    initializingPromise = null
  }
}
