/**
 * COMPRESOR DE IMÁGENES PARA MÓVILES LOW-RAM
 *
 * Optimizado para dispositivos con 2GB RAM (Xiaomi, etc.)
 * Comprime imágenes antes de subir para evitar crashes por memoria
 */

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0.1 - 1.0
  maxSizeKB?: number // Tamaño máximo en KB
  format?: 'jpeg' | 'webp'
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.7,
  maxSizeKB: 500, // 500KB máximo para móviles
  format: 'jpeg'
}

// Opciones agresivas para dispositivos con muy poca RAM
const LOW_RAM_OPTIONS: CompressionOptions = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.6,
  maxSizeKB: 300,
  format: 'jpeg'
}

/**
 * Detecta si el dispositivo tiene poca RAM
 */
export function isLowRAMDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  // @ts-ignore - deviceMemory es experimental
  const deviceMemory = navigator.deviceMemory
  if (deviceMemory && deviceMemory <= 2) return true

  // Detectar por User Agent (Xiaomi, Redmi, etc.)
  const ua = navigator.userAgent.toLowerCase()
  const lowEndDevices = ['redmi', 'xiaomi', 'poco', 'realme', 'oppo a', 'vivo y', 'samsung a0', 'samsung a1']
  return lowEndDevices.some(device => ua.includes(device))
}

/**
 * Obtiene las opciones de compresión según el dispositivo
 */
export function getCompressionOptions(): CompressionOptions {
  return isLowRAMDevice() ? LOW_RAM_OPTIONS : DEFAULT_OPTIONS
}

/**
 * Comprime una imagen File para móviles
 * Usa chunks pequeños para evitar picos de memoria
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = getCompressionOptions()
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Si ya es pequeña, devolverla sin procesar
    const fileSizeKB = file.size / 1024
    if (fileSizeKB <= (options.maxSizeKB || 500)) {
      console.log('📸 Imagen ya es pequeña, no requiere compresión')
      resolve(file)
      return
    }

    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('No se pudo crear contexto canvas'))
      return
    }

    // Crear Object URL en lugar de FileReader (más eficiente en memoria)
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      try {
        // Liberar memoria del object URL
        URL.revokeObjectURL(objectUrl)

        // Calcular dimensiones manteniendo aspecto
        let { width, height } = img
        const maxW = options.maxWidth || 1280
        const maxH = options.maxHeight || 1280

        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }

        canvas.width = width
        canvas.height = height

        // Dibujar imagen redimensionada
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        // Comprimir con calidad ajustable
        let quality = options.quality || 0.7
        const format = options.format === 'webp' ? 'image/webp' : 'image/jpeg'
        const maxSize = (options.maxSizeKB || 500) * 1024

        // Función para intentar compresión
        const tryCompress = (q: number): Promise<Blob> => {
          return new Promise((res) => {
            canvas.toBlob((blob) => {
              res(blob || new Blob())
            }, format, q)
          })
        }

        // Comprimir iterativamente si es necesario
        const compressIteratively = async () => {
          let blob = await tryCompress(quality)
          let attempts = 0
          const maxAttempts = 5

          while (blob.size > maxSize && attempts < maxAttempts && quality > 0.3) {
            quality -= 0.1
            blob = await tryCompress(quality)
            attempts++
            console.log(`📸 Recomprimiendo: ${Math.round(blob.size / 1024)}KB (q=${quality.toFixed(1)})`)
          }

          // Crear nuevo File
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, `.${options.format || 'jpg'}`),
            { type: format }
          )

          console.log(`✅ Compresión: ${Math.round(file.size / 1024)}KB → ${Math.round(compressedFile.size / 1024)}KB`)

          // Limpiar canvas de memoria
          canvas.width = 1
          canvas.height = 1

          resolve(compressedFile)
        }

        compressIteratively().catch(reject)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Error al cargar imagen'))
    }

    img.src = objectUrl
  })
}

/**
 * Comprime imagen desde URL (para OCR)
 * Devuelve data URL comprimido
 */
export async function compressImageFromUrl(
  imageUrl: string,
  options: CompressionOptions = getCompressionOptions()
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('No canvas context'))
          return
        }

        // Redimensionar
        let { width, height } = img
        const maxW = options.maxWidth || 1280
        const maxH = options.maxHeight || 1280

        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }

        canvas.width = width
        canvas.height = height

        ctx.drawImage(img, 0, 0, width, height)

        const format = options.format === 'webp' ? 'image/webp' : 'image/jpeg'
        const dataUrl = canvas.toDataURL(format, options.quality || 0.7)

        // Limpiar
        canvas.width = 1
        canvas.height = 1

        resolve(dataUrl)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => reject(new Error('Error loading image'))
    img.src = imageUrl
  })
}

/**
 * Verifica si el navegador soporta WebP
 */
export function supportsWebP(): boolean {
  if (typeof document === 'undefined') return false
  const canvas = document.createElement('canvas')
  return canvas.toDataURL('image/webp').startsWith('data:image/webp')
}
