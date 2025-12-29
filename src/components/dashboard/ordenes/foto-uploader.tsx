'use client'

import { useState, useRef } from 'react'
import { Camera, Trash2, Loader2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { extraerDatosDeImagen } from '@/lib/ocr/tesseract-service'

interface FotoUploaderProps {
  tipo: 'entrada' | 'frontal' | 'izquierda' | 'derecha' | 'trasera' | 'salida' | 'proceso'
  fotoUrl?: string
  ordenId: string
  onFotoSubida: (url: string) => void
  onOCRData?: (data: { km?: number; matricula?: string }) => void
  disabled?: boolean
}

const LABELS = {
  entrada: '📸 Entrada Frontal',
  frontal: '🚗 Frontal',
  izquierda: '⬅️ Lado Izquierdo',
  derecha: '➡️ Lado Derecho',
  trasera: '🔙 Trasera',
  salida: '✅ Salida',
  proceso: '🔧 Proceso'
}

export function FotoUploader(props: FotoUploaderProps) {
  const { tipo, fotoUrl, ordenId, onFotoSubida, onOCRData, disabled } = props
  const [subiendo, setSubiendo] = useState(false)
  const [procesandoOCR, setProcesandoOCR] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(fotoUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setSubiendo(true)
      setPreviewUrl(URL.createObjectURL(file))

      // Subir a Telegram
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ordenId', ordenId)
      formData.append('tipo', tipo)

      const res = await fetch('/api/telegram/upload-photo', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      onFotoSubida(data.imageUrl)
      toast.success('✅ Foto subida')

      // OCR solo para foto entrada
      if (tipo === 'entrada' && onOCRData) {
        procesarOCRFoto(data.imageUrl)
      }
    } catch (error: any) {
      toast.error(error.message)
      setPreviewUrl(null)
    } finally {
      setSubiendo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const procesarOCRFoto = async (imageUrl: string) => {
    try {
      setProcesandoOCR(true)
      toast.loading('🔍 Procesando OCR (primera vez tarda más)...')
      
      const resultado = await extraerDatosDeImagen(imageUrl)

      if (!resultado.success) {
        console.warn('OCR warning:', resultado.error)
        toast.dismiss()
        return
      }

      if (resultado.matricula || resultado.km) {
        onOCRData?.({ matricula: resultado.matricula || undefined, km: resultado.km || undefined })
        const msg = [resultado.matricula, resultado.km ? `${resultado.km}km` : ''].filter(Boolean).join(' ')
        toast.dismiss()
        toast.success(`✅ OCR: ${msg}`)
      } else {
        toast.dismiss()
        toast.info('ℹ️ No se encontró matrícula o km')
      }
    } catch (error: any) {
      toast.dismiss()
      console.error('OCR Error:', error)
    } finally {
      setProcesandoOCR(false)
    }
  }

  const handleEliminar = () => {
    setPreviewUrl(null)
    onFotoSubida('')
    toast.success('Foto eliminada')
  }

  const mostrarPreview = previewUrl || fotoUrl

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-700 block">{LABELS[tipo]}</label>

      {mostrarPreview ? (
        <div className="space-y-2">
          <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
            <img src={mostrarPreview} alt={tipo} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
              <a href={mostrarPreview} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Eye className="w-4 h-4" />
              </a>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700" disabled={disabled || subiendo}>
                <Camera className="w-4 h-4" />
              </button>
              <button onClick={handleEliminar} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700" disabled={disabled}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {subiendo && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"><Loader2 className="w-6 h-6 text-white animate-spin" /></div>}
            {procesandoOCR && <div className="absolute bottom-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> OCR...</div>}
          </div>
          <p className="text-xs text-green-600">✅ Guardada</p>
        </div>
      ) : (
        <button onClick={() => fileInputRef.current?.click()} disabled={disabled || subiendo} className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center cursor-pointer bg-gray-50 text-gray-600 hover:text-blue-600 disabled:opacity-50">
          {subiendo ? (<><Loader2 className="w-6 h-6 animate-spin mb-2" /><span className="text-xs font-medium">Subiendo...</span></>) : (<><Camera className="w-6 h-6 mb-2" /><span className="text-xs font-medium">Click para subir</span></>)}
        </button>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFotoChange} className="hidden" disabled={disabled || subiendo} />
    </div>
  )
}
