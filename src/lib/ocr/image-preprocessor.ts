/**
 * PREPROCESADOR DE IMÁGENES PARA OCR
 *
 * Mejora la calidad de las imágenes antes de pasarlas a Tesseract
 * Técnicas: escala de grises, contraste, binarización
 * 100% gratuito - usa Canvas API nativo del navegador
 */

export interface PreprocessOptions {
  grayscale?: boolean
  contrast?: number  // 1.0 = normal, >1 = más contraste
  brightness?: number // 1.0 = normal
  sharpen?: boolean
  threshold?: number  // Para binarización (0-255)
  resize?: { maxWidth?: number; maxHeight?: number }
}

const defaultOptions: PreprocessOptions = {
  grayscale: true,
  contrast: 1.4,
  brightness: 1.1,
  sharpen: true,
  resize: { maxWidth: 1200, maxHeight: 1200 }
}

/**
 * Preprocesa una imagen para mejorar resultados de OCR
 * @param imageUrl URL de la imagen (data URL o blob URL)
 * @param options Opciones de preprocesamiento
 * @returns URL de la imagen procesada (data URL)
 */
export async function preprocessImage(
  imageUrl: string,
  options: PreprocessOptions = defaultOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('No se pudo crear contexto canvas'))
          return
        }

        // Calcular dimensiones (resize si es necesario)
        let { width, height } = img
        if (options.resize) {
          const { maxWidth = 1200, maxHeight = 1200 } = options.resize
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width = Math.floor(width * ratio)
            height = Math.floor(height * ratio)
          }
        }

        canvas.width = width
        canvas.height = height

        // Dibujar imagen original
        ctx.drawImage(img, 0, 0, width, height)

        // Obtener datos de píxeles
        let imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data

        // Aplicar escala de grises
        if (options.grayscale) {
          for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(
              data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
            )
            data[i] = gray     // R
            data[i + 1] = gray // G
            data[i + 2] = gray // B
          }
        }

        // Aplicar brillo y contraste
        if (options.brightness !== 1 || options.contrast !== 1) {
          const brightness = options.brightness || 1
          const contrast = options.contrast || 1
          const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255))

          for (let i = 0; i < data.length; i += 4) {
            // Aplicar brillo
            data[i] = Math.min(255, data[i] * brightness)
            data[i + 1] = Math.min(255, data[i + 1] * brightness)
            data[i + 2] = Math.min(255, data[i + 2] * brightness)

            // Aplicar contraste
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128))
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128))
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128))
          }
        }

        // Aplicar binarización (threshold)
        if (options.threshold !== undefined) {
          for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] // Ya está en escala de grises
            const binary = gray > options.threshold ? 255 : 0
            data[i] = binary
            data[i + 1] = binary
            data[i + 2] = binary
          }
        }

        // Escribir datos procesados
        ctx.putImageData(imageData, 0, 0)

        // Aplicar sharpening (unsharp mask simplificado)
        if (options.sharpen) {
          // Re-dibujar con efecto de nitidez usando filtros CSS
          const tempCanvas = document.createElement('canvas')
          const tempCtx = tempCanvas.getContext('2d')
          if (tempCtx) {
            tempCanvas.width = width
            tempCanvas.height = height
            tempCtx.filter = 'contrast(1.1) brightness(1.05)'
            tempCtx.drawImage(canvas, 0, 0)
            ctx.drawImage(tempCanvas, 0, 0)
          }
        }

        // Devolver como data URL
        resolve(canvas.toDataURL('image/png', 1.0))
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Error al cargar la imagen'))
    }

    img.src = imageUrl
  })
}

/**
 * Detecta si la imagen necesita preprocesamiento adicional
 * basándose en análisis básico de histograma
 */
export function analyzeImageQuality(imageUrl: string): Promise<{
  needsContrast: boolean
  needsBrightness: boolean
  recommendedOptions: PreprocessOptions
}> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('No canvas context'))
        return
      }

      // Usar tamaño pequeño para análisis
      const sampleSize = 100
      canvas.width = sampleSize
      canvas.height = sampleSize
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize)

      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
      const data = imageData.data

      // Calcular estadísticas
      let sum = 0
      let min = 255
      let max = 0

      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(
          data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
        )
        sum += gray
        min = Math.min(min, gray)
        max = Math.max(max, gray)
      }

      const pixelCount = data.length / 4
      const mean = sum / pixelCount
      const range = max - min

      // Determinar recomendaciones
      const needsContrast = range < 150 // Bajo rango dinámico
      const needsBrightness = mean < 100 || mean > 200 // Muy oscuro o muy claro

      resolve({
        needsContrast,
        needsBrightness,
        recommendedOptions: {
          grayscale: true,
          contrast: needsContrast ? 1.6 : 1.3,
          brightness: mean < 100 ? 1.3 : mean > 200 ? 0.9 : 1.1,
          sharpen: true,
          resize: { maxWidth: 1200, maxHeight: 1200 }
        }
      })
    }

    img.onerror = () => reject(new Error('Error loading image'))
    img.src = imageUrl
  })
}
