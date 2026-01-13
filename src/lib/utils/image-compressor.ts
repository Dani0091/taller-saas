/**
 * Compresor de imágenes optimizado para móviles con poca RAM (2GB)
 * Usa técnicas de bajo consumo de memoria:
 * - Procesamiento por chunks
 * - Canvas de tamaño limitado
 * - Liberación agresiva de memoria
 */

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxSizeKB?: number
}

const defaultOptions: CompressionOptions = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.7,
  maxSizeKB: 500
}

/**
 * Comprime una imagen de forma segura para móviles con poca RAM
 * @param file Archivo de imagen original
 * @param options Opciones de compresión
 * @returns Blob comprimido
 */
export async function compressImageForMobile(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const opts = { ...defaultOptions, ...options }

  return new Promise((resolve, reject) => {
    // Validar que es una imagen
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen'))
      return
    }

    // Si ya es pequeño, no comprimir
    if (file.size < (opts.maxSizeKB! * 1024)) {
      resolve(file)
      return
    }

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      try {
        // Liberar URL inmediatamente
        URL.revokeObjectURL(url)

        // Calcular nuevas dimensiones manteniendo aspecto
        let { width, height } = img
        const maxW = opts.maxWidth!
        const maxH = opts.maxHeight!

        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }

        // Crear canvas pequeño para bajo consumo de memoria
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d', {
          alpha: false, // Sin alpha = menos memoria
          willReadFrequently: false
        })

        if (!ctx) {
          reject(new Error('No se pudo crear contexto canvas'))
          return
        }

        // Fondo blanco (evita transparencia)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)

        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height)

        // Convertir a blob con compresión
        canvas.toBlob(
          (blob) => {
            // Limpiar canvas
            canvas.width = 0
            canvas.height = 0

            if (!blob) {
              reject(new Error('Error al comprimir imagen'))
              return
            }

            console.log(`📸 Imagen comprimida: ${Math.round(file.size / 1024)}KB → ${Math.round(blob.size / 1024)}KB`)
            resolve(blob)
          },
          'image/jpeg',
          opts.quality
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Error al cargar imagen'))
    }

    img.src = url
  })
}

/**
 * Convierte File/Blob a base64 de forma eficiente
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      // Extraer solo la parte base64 (sin el prefijo data:...)
      const base64Data = base64.split(',')[1] || base64
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Verifica si el dispositivo tiene poca RAM
 */
export function isLowMemoryDevice(): boolean {
  // @ts-ignore - deviceMemory es experimental
  const memory = navigator.deviceMemory

  if (memory && memory <= 4) {
    return true
  }

  // Detectar móviles Android de gama baja por user agent
  const ua = navigator.userAgent.toLowerCase()
  const isAndroid = ua.includes('android')
  const isLowEndKeywords = ['xiaomi', 'redmi', 'poco', 'samsung gt', 'huawei y']

  if (isAndroid && isLowEndKeywords.some(k => ua.includes(k))) {
    return true
  }

  return false
}

/**
 * Obtiene opciones de compresión adaptadas al dispositivo
 */
export function getAdaptiveCompressionOptions(): CompressionOptions {
  if (isLowMemoryDevice()) {
    return {
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.6,
      maxSizeKB: 300
    }
  }

  return defaultOptions
}
