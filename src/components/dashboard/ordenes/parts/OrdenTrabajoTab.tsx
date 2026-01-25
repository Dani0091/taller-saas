/**
 * @fileoverview Tab de Trabajo para detalle de orden
 * @description Diagnóstico, trabajos realizados y tiempos
 * REGLAS:
 * - Sin createClient() - solo Server Actions
 * - Sin cálculos matemáticos
 * - Componente pasivo que recibe props
 */
'use client'

import { Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NumberInput } from '@/components/ui/number-input'
import { FRACCIONES_HORA, FOTOS_DIAGNOSTICO } from '@/lib/constants'
import { FotoUploader } from '../foto-uploader'
import { getFotoByKey, setFotoByKey } from '@/lib/utils'

interface OrdenTrabajoTabProps {
  // Modo
  modoCrear: boolean
  ordenSeleccionada?: string | null

  // Datos del formulario
  diagnostico: string
  trabajosRealizados: string
  tiempoEstimadoHoras: number
  tiempoRealHoras: number
  fotosDiagnostico: string

  // Callbacks
  onDiagnosticoChange: (value: string) => void
  onTrabajosRealizadosChange: (value: string) => void
  onTiempoEstimadoChange: (value: number) => void
  onTiempoRealChange: (value: number) => void
  onFotosDiagnosticoChange: (fotos: string) => void

  // Validaciones
  validarHorasTrabajo: (horas: number, campo: string) => boolean
}

export function OrdenTrabajoTab({
  modoCrear,
  ordenSeleccionada,
  diagnostico,
  trabajosRealizados,
  tiempoEstimadoHoras,
  tiempoRealHoras,
  fotosDiagnostico,
  onDiagnosticoChange,
  onTrabajosRealizadosChange,
  onTiempoEstimadoChange,
  onTiempoRealChange,
  onFotosDiagnosticoChange,
  validarHorasTrabajo,
}: OrdenTrabajoTabProps) {
  return (
    <>
      {/* Diagnóstico */}
      <Card className="p-4">
        <Label className="text-sm font-semibold mb-2 block">Diagnóstico técnico</Label>
        <Textarea
          value={diagnostico || ''}
          onChange={(e) => onDiagnosticoChange(e.target.value)}
          placeholder="Resultado del diagnóstico del vehículo..."
          rows={3}
          className="resize-none"
        />
      </Card>

      {/* Fotos de diagnóstico */}
      <Card className="p-4 bg-amber-50/50 border-amber-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📷</span>
          <Label className="text-sm font-semibold">Fotos de diagnóstico</Label>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Sube fotos del cuadro de instrumentos, testigos de fallo, o cualquier evidencia visual del problema.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FOTOS_DIAGNOSTICO.map((tipoFoto) => (
            <FotoUploader
              key={tipoFoto}
              tipo={tipoFoto}
              fotoUrl={getFotoByKey(fotosDiagnostico || '', tipoFoto)}
              ordenId={ordenSeleccionada || 'nueva'}
              onFotoSubida={(url) => {
                const nuevasFotos = setFotoByKey(fotosDiagnostico || '', tipoFoto, url)
                onFotosDiagnosticoChange(nuevasFotos)
              }}
              disabled={!ordenSeleccionada && !modoCrear}
            />
          ))}
        </div>
      </Card>

      {/* Trabajos realizados */}
      <Card className="p-4">
        <Label className="text-sm font-semibold mb-2 block">Trabajos realizados</Label>
        <Textarea
          value={trabajosRealizados || ''}
          onChange={(e) => onTrabajosRealizadosChange(e.target.value)}
          placeholder="Describe los trabajos que se han realizado..."
          rows={3}
          className="resize-none"
        />
      </Card>

      {/* Tiempos con selector de fracciones */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-sky-600" />
          <Label className="text-sm font-semibold">Tiempo de trabajo</Label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Horas estimadas */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Horas estimadas</Label>
            <select
              value={tiempoEstimadoHoras || 0}
              onChange={(e) => onTiempoEstimadoChange(parseFloat(e.target.value))}
              className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white text-center"
            >
              <option value="0">Sin estimar</option>
              {FRACCIONES_HORA.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Horas reales */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Horas reales</Label>
            <select
              value={tiempoRealHoras || 0}
              onChange={(e) => onTiempoRealChange(parseFloat(e.target.value))}
              className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white text-center"
            >
              <option value="0">Sin registrar</option>
              {FRACCIONES_HORA.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Input manual para valores personalizados */}
        <div className="mt-3 pt-3 border-t">
          <Label className="text-xs text-gray-500 mb-2 block">O introduce un valor personalizado:</Label>
          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              value={tiempoEstimadoHoras}
              onChange={(value) => {
                if (validarHorasTrabajo(value, 'tiempo_estimado_horas')) {
                  onTiempoEstimadoChange(value)
                }
              }}
              placeholder="Estimadas"
              className="text-center"
              min={0}
              max={100}
            />
            <NumberInput
              value={tiempoRealHoras}
              onChange={(value) => {
                if (validarHorasTrabajo(value, 'tiempo_real_horas')) {
                  onTiempoRealChange(value)
                }
              }}
              placeholder="Reales"
              className="text-center"
              min={0}
              max={100}
            />
          </div>
        </div>
      </Card>
    </>
  )
}
