/**
 * @fileoverview Tab de Fotos (Entrada y Salida)
 * @description Gestión de fotos de vehículos con OCR para matrícula y KM
 * REGLAS:
 * - Componente pasivo que recibe props y callbacks
 * - OCR con validación de matrícula contra vehículo seleccionado
 * - Actualización de KM mediante callback
 */
'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { FotoUploader } from '../foto-uploader'
import { getFotoUrl, setFotoUrl } from '@/lib/utils'
import { toast } from 'sonner'

interface VehiculoSeleccionado {
  id: string
  matricula: string
}

interface OrdenFotosTabProps {
  // Flags de estado
  modoCrear: boolean
  ordenSeleccionada: string | null | undefined

  // Datos de fotos
  fotosEntrada: string
  fotosSalida: string

  // Vehículo seleccionado (para validación OCR)
  vehiculoSeleccionado?: VehiculoSeleccionado | null
  vehiculoId?: string

  // Callbacks
  onFotosEntradaChange: (fotos: string) => void
  onFotosSalidaChange: (fotos: string) => void
  onActualizarKMVehiculo: (km: number) => void
}

export function OrdenFotosTab({
  modoCrear,
  ordenSeleccionada,
  fotosEntrada,
  fotosSalida,
  vehiculoSeleccionado,
  vehiculoId,
  onFotosEntradaChange,
  onFotosSalidaChange,
  onActualizarKMVehiculo,
}: OrdenFotosTabProps) {
  /**
   * Maneja los datos extraídos por OCR de la foto de entrada
   */
  const handleOCRData = (data: { km?: number; matricula?: string }) => {
    // Verificar matrícula si hay vehículo seleccionado
    if (data.matricula && vehiculoSeleccionado) {
      const matriculaLimpia = data.matricula.replace(/[\s-]/g, '').toUpperCase()
      const matriculaVehiculo = vehiculoSeleccionado.matricula.replace(/[\s-]/g, '').toUpperCase()

      if (matriculaLimpia === matriculaVehiculo) {
        toast.success(`✅ Matrícula coincide: ${data.matricula}`)
      } else {
        toast.warning(`⚠️ Matrícula detectada (${data.matricula}) no coincide con el vehículo (${vehiculoSeleccionado.matricula})`)
      }
    } else if (data.matricula) {
      toast.info(`Matrícula detectada: ${data.matricula}`)
    }

    // Actualizar KM del vehículo
    if (data.km && vehiculoId) {
      onActualizarKMVehiculo(data.km)
    } else if (data.km) {
      toast.info(`KM detectados: ${data.km.toLocaleString()} (selecciona un vehículo para guardar)`)
    }
  }

  if (modoCrear) {
    return (
      <Card className="p-4 bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          💡 Guarda la orden primero para poder subir fotos
        </p>
      </Card>
    )
  }

  return (
    <>
      {/* Fotos de entrada */}
      <Card className="p-4">
        <Label className="text-sm font-semibold mb-3 block">📸 Fotos de Entrada</Label>
        <p className="text-xs text-gray-500 mb-4">
          Documenta el estado del vehículo al llegar al taller
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FotoUploader
            tipo="entrada"
            ordenId={ordenSeleccionada || ''}
            fotoUrl={getFotoUrl(fotosEntrada || '', 0)}
            onFotoSubida={(url) => {
              onFotosEntradaChange(setFotoUrl(fotosEntrada || '', 0, url))
            }}
            onOCRData={handleOCRData}
          />
          <FotoUploader
            tipo="frontal"
            ordenId={ordenSeleccionada || ''}
            fotoUrl={getFotoUrl(fotosEntrada || '', 1)}
            onFotoSubida={(url) => {
              onFotosEntradaChange(setFotoUrl(fotosEntrada || '', 1, url))
            }}
          />
          <FotoUploader
            tipo="izquierda"
            ordenId={ordenSeleccionada || ''}
            fotoUrl={getFotoUrl(fotosEntrada || '', 2)}
            onFotoSubida={(url) => {
              onFotosEntradaChange(setFotoUrl(fotosEntrada || '', 2, url))
            }}
          />
          <FotoUploader
            tipo="derecha"
            ordenId={ordenSeleccionada || ''}
            fotoUrl={getFotoUrl(fotosEntrada || '', 3)}
            onFotoSubida={(url) => {
              onFotosEntradaChange(setFotoUrl(fotosEntrada || '', 3, url))
            }}
          />
        </div>
      </Card>

      {/* Fotos de salida */}
      <Card className="p-4">
        <Label className="text-sm font-semibold mb-3 block">✅ Fotos de Salida</Label>
        <p className="text-xs text-gray-500 mb-4">
          Documenta el estado del vehículo al entregar
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FotoUploader
            tipo="salida"
            ordenId={ordenSeleccionada || ''}
            fotoUrl={getFotoUrl(fotosSalida || '', 0)}
            onFotoSubida={(url) => {
              onFotosSalidaChange(setFotoUrl(fotosSalida || '', 0, url))
            }}
          />
          <FotoUploader
            tipo="trasera"
            ordenId={ordenSeleccionada || ''}
            fotoUrl={getFotoUrl(fotosSalida || '', 1)}
            onFotoSubida={(url) => {
              onFotosSalidaChange(setFotoUrl(fotosSalida || '', 1, url))
            }}
          />
        </div>
      </Card>
    </>
  )
}
