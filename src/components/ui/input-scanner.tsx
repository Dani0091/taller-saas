/**
 * @fileoverview Botón de escaneo inline para inputs
 * @description Botón pequeño que permite escanear matrícula, VIN o KM
 * usando la cámara y OCR del backend (no consume memoria del móvil)
 *
 * OPTIMIZADO: Usa API backend para evitar crashes en móviles con poca RAM
 */
'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  compressImageForMobile,
  getAdaptiveCompressionOptions
} from '@/lib/utils/image-compressor'

interface InputScannerProps {
  tipo: 'matricula' | 'vin' | 'km'
  onResult: (value: string) => void
  disabled?: boolean
}

// Límite de tamaño de archivo (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Tipos MIME permitidos
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

// Patrones específicos para VIN (17 caracteres alfanuméricos, sin I, O, Q)
const VIN_PATTERN = /\b[A-HJ-NPR-Z0-9]{17}\b/gi

function extraerVIN(texto: string): string | null {
  const textoLimpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, '')

  // Buscar secuencia de 17 caracteres válidos
  VIN_PATTERN.lastIndex = 0
  const match = VIN_PATTERN.exec(textoLimpio)

  if (match) {
    return match[0]
  }

  // Buscar cualquier secuencia de 17 caracteres alfanuméricos
  const secuencias = textoLimpio.match(/[A-HJ-NPR-Z0-9]{17}/g)
  if (secuencias && secuencias.length > 0) {
    return secuencias[0]
  }

  return null
}

export function InputScanner({ tipo, onResult, disabled }: InputScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Limpiar URL cuando cambia (previene memory leak)
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleScan = async (file: File) => {
    // Validar tamaño de archivo
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Archivo muy grande (máximo 10MB)')
      return
    }

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Formato no soportado. Usa JPG, PNG o WebP')
      return
    }

    try {
      setScanning(true)

      // Revocar URL anterior si existe
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      // Comprimir imagen para móviles
      let fileToScan: Blob = file
      try {
        const opts = getAdaptiveCompressionOptions()
        fileToScan = await compressImageForMobile(file, opts)
      } catch {
        // Si falla la compresión, usar original
      }

      // Crear preview
      const url = URL.createObjectURL(fileToScan)
      setPreviewUrl(url)
      setShowPreview(true)

      toast.loading('Escaneando...', { id: 'scan' })

      // Enviar al backend OCR (no consume memoria del móvil)
      const formData = new FormData()
      formData.append('file', fileToScan, 'scan.jpg')
      formData.append('tipo', tipo)

      const res = await fetch('/api/ocr/process', {
        method: 'POST',
        body: formData
      })

      const resultado = await res.json()
      toast.dismiss('scan')

      if (!resultado.success) {
        toast.error(resultado.error || 'Error al procesar imagen')
        setScanning(false)
        return
      }

      let valorDetectado: string | null = null

      switch (tipo) {
        case 'matricula':
          valorDetectado = resultado.matricula
          break
        case 'vin':
          valorDetectado = extraerVIN(resultado.texto || '')
          break
        case 'km':
          valorDetectado = resultado.km?.toString() || null
          break
      }

      if (valorDetectado) {
        onResult(valorDetectado)
        toast.success(`${tipo === 'matricula' ? 'Matrícula' : tipo === 'vin' ? 'VIN' : 'KM'}: ${valorDetectado}`)
        // Limpiar y cerrar
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setShowPreview(false)
        setPreviewUrl(null)
      } else {
        toast.error(`No se detectó ${tipo === 'matricula' ? 'la matrícula' : tipo === 'vin' ? 'el VIN' : 'los KM'}`)
      }

      setScanning(false)
    } catch (error) {
      toast.dismiss('scan')
      toast.error('Error al escanear')
      setScanning(false)
      setShowPreview(false)
    }
  }

  const cancelScan = () => {
    // Limpiar URL para prevenir memory leak
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setShowPreview(false)
    setPreviewUrl(null)
    setScanning(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const labels = {
    matricula: 'Escanear matrícula',
    vin: 'Escanear VIN/Bastidor',
    km: 'Escanear kilómetros'
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || scanning}
        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
        title={labels[tipo]}
      >
        {scanning ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Camera className="w-4 h-4" />
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleScan(file)
        }}
        className="hidden"
      />

      {/* Preview modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {scanning ? 'Procesando...' : 'Vista previa'}
              </h3>
              <button
                onClick={cancelScan}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <img
              src={previewUrl}
              alt="Preview"
              className="w-full rounded-lg"
            />

            {scanning && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">Analizando imagen...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
