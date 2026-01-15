'use client'

import { useState, useRef } from 'react'
import { Camera, X, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { ocrService } from '@/lib/ocr/ocr-service'

interface OCRScannerProps {
  tipo: 'matricula' | 'cliente' | 'general'
  onResultado: (texto: string, imagen: string, confianza: number) => void
  label?: string
  descripcion?: string
}

export function OCRScanner({ tipo, onResultado, label, descripcion }: OCRScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)
  const [confianza, setConfianza] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleCaptura = async (file: File) => {
    try {
      setScanning(true)
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        const imagenUrl = e.target?.result as string
        setPreview(imagenUrl)

        // Escanear con OCR
        let ocrResult
        switch (tipo) {
          case 'matricula':
            ocrResult = await ocrService.escanearMatricula(imagenUrl)
            break
          case 'cliente':
            ocrResult = await ocrService.escanearCliente(imagenUrl)
            break
          default:
            ocrResult = await ocrService.escanearTexto(imagenUrl)
        }

        setResultado(ocrResult.texto)
        setConfianza(ocrResult.confianza)
        
        if (ocrResult.confianza > 0.5) {
          toast.success('✅ Escaneado correctamente')
          onResultado(ocrResult.texto, imagenUrl, ocrResult.confianza)
        } else {
          toast.warning('⚠️ Confianza baja. Revisa el resultado')
        }
      }
      
      reader.readAsDataURL(file)
    } catch (error: any) {
      toast.error('Error al escanear: ' + error.message)
      console.error(error)
    } finally {
      setScanning(false)
    }
  }

  const tiposLabels = {
    matricula: 'Escanear Matrícula',
    cliente: 'Escanear Datos Cliente',
    general: 'Escanear Texto'
  }

  return (
    <Card className="p-4 border-2 border-dashed border-blue-300 bg-blue-50">
      <div className="flex items-center gap-2 mb-2">
        <Camera className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-sm sm:text-base">{label || tiposLabels[tipo]}</h3>
      </div>
      
      {descripcion && <p className="text-xs text-gray-600 mb-3">{descripcion}</p>}

      {!preview ? (
        <div className="text-center">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleCaptura(file)
            }}
            className="hidden"
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={scanning}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Escaneando...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Capturar Foto
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <img src={preview} alt="Preview" className="w-full rounded-lg max-h-40 object-cover" />
          
          {resultado && (
            <div className="p-3 bg-white rounded-lg border border-green-200">
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 font-medium">Resultado OCR</p>
                  <p className="text-sm font-mono font-bold text-gray-900 break-all">{resultado}</p>
                  <p className="text-xs text-gray-500 mt-1">Confianza: {(confianza * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setPreview(null)
                setResultado(null)
                if (inputRef.current) inputRef.current.value = ''
              }}
              variant="outline"
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (resultado) onResultado(resultado, preview, confianza)
                setPreview(null)
                setResultado(null)
              }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar
            </Button>
          </div>
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
      <video ref={videoRef} className="hidden" />
    </Card>
  )
}
