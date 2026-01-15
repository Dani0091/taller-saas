'use client'

import { extraerDatosDeImagen } from './tesseract-service'

interface OCRResult {
  texto: string
  confianza: number
  matricula?: string | null
  km?: number | null
}

export const ocrService = {
  async escanearMatricula(imagenUrl: string): Promise<OCRResult> {
    const result = await extraerDatosDeImagen(imagenUrl)
    return {
      texto: result.matricula || result.texto,
      confianza: result.confianza,
      matricula: result.matricula,
      km: result.km
    }
  },

  async escanearCliente(imagenUrl: string): Promise<OCRResult> {
    const result = await extraerDatosDeImagen(imagenUrl)
    return {
      texto: result.texto,
      confianza: result.confianza
    }
  },

  async escanearTexto(imagenUrl: string): Promise<OCRResult> {
    const result = await extraerDatosDeImagen(imagenUrl)
    return {
      texto: result.texto,
      confianza: result.confianza,
      matricula: result.matricula,
      km: result.km
    }
  }
}
