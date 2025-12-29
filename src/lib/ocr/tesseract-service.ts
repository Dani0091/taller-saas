'use client'

import Tesseract from 'tesseract.js'

let workerInstance: any = null
let initializingPromise: any = null

async function initializeWorker() {
  if (!workerInstance && !initializingPromise) {
    initializingPromise = (async () => {
      console.log('⏳ [TESSERACT] Inicializando worker...')
      try {
        workerInstance = await Tesseract.createWorker('spa', 1, {
          corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5/tesseract-core.wasm.js'
        })
        console.log('✅ [TESSERACT] Worker listo')
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

export async function extraerDatosDeImagen(imagenUrl: string) {
  try {
    console.log('📸 [TESSERACT] Procesando:', imagenUrl.substring(0, 50))
    
    const worker = await initializeWorker()
    
    console.log('🔍 [TESSERACT] Reconociendo texto...')
    const result = await worker.recognize(imagenUrl)
    
    const texto = result.data.text || ''
    const confianza = result.data.confidence || 0

    console.log('📝 [TESSERACT] Texto extraído:', texto.substring(0, 100))

    // Extraer matrícula: AB-1234-CD o AB1234CD
    const matriculaMatch = texto.match(/([A-Z]{2,3})\s*[-]?\s*([0-9]{3,4})\s*[-]?\s*([A-Z]{2,3})/i)
    const matricula = matriculaMatch ? matriculaMatch[0].toUpperCase() : null

    // Extraer KM: 245000 km
    const kmMatch = texto.match(/([0-9]{3,6})\s*(?:km|kms|KM)/i)
    const km = kmMatch ? parseInt(kmMatch[1]) : null

    console.log('✅ [TESSERACT] Completado:', { matricula, km, confianza })

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
