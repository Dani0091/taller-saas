/**
 * @fileoverview Botón de escaneo inline para inputs
 * @description Botón pequeño que permite escanear matrícula, VIN o KM
 * usando la cámara y OCR existente (Tesseract)
 */
'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { extraerDatosDeImagen } from '@/lib/ocr/tesseract-service'

interface InputScannerProps {
  tipo: 'matricula' | 'vin' | 'km'
  onResult: (value: string) => void
  disabled?: boolean
}

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

  const handleScan = async (file: File) => {
    try {
      setScanning(true)

      // Crear preview
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setShowPreview(true)

      toast.loading('🔍 Escaneando...', { id: 'scan' })

      // Convertir a base64 para OCR
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string

        // Procesar con OCR
        const resultado = await extraerDatosDeImagen(base64, {
          preprocess: true,
          adaptivePreprocess: true,
          retryOnLowConfidence: true
        })

        toast.dismiss('scan')

        let valorDetectado: string | null = null

        switch (tipo) {
          case 'matricula':
            valorDetectado = resultado.matricula
            break
          case 'vin':
            valorDetectado = extraerVIN(resultado.texto)
            break
          case 'km':
            valorDetectado = resultado.km?.toString() || null
            break
        }

        if (valorDetectado) {
          onResult(valorDetectado)
          toast.success(`✅ ${tipo === 'matricula' ? 'Matrícula' : tipo === 'vin' ? 'VIN' : 'KM'}: ${valorDetectado}`)
          setShowPreview(false)
          setPreviewUrl(null)
        } else {
          toast.error(`No se detectó ${tipo === 'matricula' ? 'la matrícula' : tipo === 'vin' ? 'el VIN' : 'los KM'}`)
        }

        setScanning(false)
      }

      reader.readAsDataURL(file)
    } catch (error: any) {
      toast.dismiss('scan')
      toast.error('Error al escanear')
      console.error(error)
      setScanning(false)
      setShowPreview(false)
    }
  }

  const cancelScan = () => {
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
