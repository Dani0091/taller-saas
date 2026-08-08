/**
 * @fileoverview Tab de Fotos (Entrada y Salida)
 * @description Gestión de fotos de vehículos con OCR para matrícula y KM
 * REGLAS:
 * - Componente pasivo que recibe props y callbacks
 * - OCR con validación de matrícula contra vehículo seleccionado
 * - Actualización de KM mediante callback
 */
'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FotoUploader } from '../foto-uploader'
import { getFotoUrl, setFotoUrl, getFotoByKey, setFotoByKey } from '@/lib/utils'
import { toast } from 'sonner'

interface VehiculoSeleccionado {
  id: string
  matricula: string
  vin?: string | null
}

interface OrdenFotosTabProps {
  // Flags de estado
  modoCrear: boolean
  ordenSeleccionada: string | null | undefined

  // Datos de fotos
  fotosEntrada: string
  fotosSalida: string
  fotosDiagnostico?: string

  // Vehículo seleccionado (para validación OCR)
  vehiculoSeleccionado?: VehiculoSeleccionado | null
  vehiculoId?: string

  // Callbacks
  onFotosEntradaChange: (fotos: string) => void
  onFotosSalidaChange: (fotos: string) => void
  onFotosDiagnosticoChange?: (fotos: string) => void
  onActualizarKMVehiculo: (km: number) => void
  onActualizarVin?: (vin: string) => void

  /** Orden facturada — todos los campos quedan de solo lectura */
  readOnly?: boolean
}

export function OrdenFotosTab({
  modoCrear,
  ordenSeleccionada,
  fotosEntrada,
  fotosSalida,
  fotosDiagnostico,
  vehiculoSeleccionado,
  vehiculoId,
  onFotosEntradaChange,
  onFotosSalidaChange,
  onFotosDiagnosticoChange,
  onActualizarKMVehiculo,
  onActualizarVin,
  readOnly = false,
}: OrdenFotosTabProps) {
  const [vinInput, setVinInput] = useState(vehiculoSeleccionado?.vin || '')
  const [guardandoVin, setGuardandoVin] = useState(false)

  useEffect(() => {
    setVinInput(vehiculoSeleccionado?.vin || '')
  }, [vehiculoSeleccionado?.vin])

  const vinCambiado = vinInput.trim().toUpperCase() !== (vehiculoSeleccionado?.vin || '').toUpperCase()

  const handleGuardarVin = async () => {
    if (!onActualizarVin) return
    setGuardandoVin(true)
    await onActualizarVin(vinInput.trim())
    setGuardandoVin(false)
  }
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
    <fieldset disabled={readOnly} className="contents">
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

      {/* Bastidor (VIN) — foto + texto en un único sitio: foto capturada en el wizard
          de creación (o súbela/reemplázala aquí), y el número de bastidor en texto,
          editable, sincronizado con el vehículo */}
      {onFotosDiagnosticoChange && (
        <Card className="p-4">
          <Label className="text-sm font-semibold mb-3 block">🔩 Bastidor (VIN)</Label>

          {onActualizarVin && (
            <div className="mb-4">
              <Label className="text-xs text-gray-500 mb-1 block">Número de bastidor</Label>
              <div className="flex gap-2">
                <Input
                  value={vinInput}
                  onChange={(e) => setVinInput(e.target.value.toUpperCase().slice(0, 17))}
                  placeholder="WVWZZZ1KZBW123456"
                  maxLength={17}
                  className="font-mono uppercase flex-1"
                />
                {vinCambiado && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGuardarVin}
                    disabled={guardandoVin}
                    className="bg-sky-600 hover:bg-sky-700 shrink-0"
                  >
                    {guardandoVin ? 'Guardando...' : 'Guardar'}
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">17 caracteres</p>
            </div>
          )}

          <p className="text-xs text-gray-500 mb-2">
            Foto de la placa del bastidor, capturada al crear la orden (o súbela aquí)
          </p>
          <div className="max-w-[200px]">
            <FotoUploader
              tipo="bastidor"
              ordenId={ordenSeleccionada || ''}
              fotoUrl={getFotoByKey(fotosDiagnostico || '', 'bastidor')}
              onFotoSubida={(url) => {
                onFotosDiagnosticoChange(setFotoByKey(fotosDiagnostico || '', 'bastidor', url))
              }}
            />
          </div>
        </Card>
      )}

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
    </fieldset>
  )
}
