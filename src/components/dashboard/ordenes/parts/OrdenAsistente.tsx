/**
 * @fileoverview Piezas del asistente de nueva orden
 * @description Indicador de pasos, resumen del paso 4 y botones de avance.
 * Extraído sin cambios de detalle-orden-sheet.
 */
'use client'

import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Paso = 1 | 2 | 3 | 4

const TITULOS_PASO = ['Selecciona Vehículo', 'Selecciona Cliente', 'Describe el Trabajo', 'Revisar Orden']

export function PasosAsistente({ paso }: { paso: Paso }) {
  return (
    <div className="bg-white border-b shrink-0 px-4 py-4">
      <div className="flex items-center mb-3">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div
              className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s < paso
                  ? 'bg-success text-white'
                  : s === paso
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {s < paso ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 4 && (
              <div className="flex-1 h-1 mx-1 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full bg-primary transition-all duration-300 ${s < paso ? 'w-full' : 'w-0'}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-lg font-bold text-gray-900">Paso {paso} de 4</p>
      <p className="text-sm text-gray-500">{TITULOS_PASO[paso - 1]}</p>
    </div>
  )
}

interface ResumenProps {
  vehiculo?: { marca?: string | null; modelo?: string | null; matricula?: string | null; kilometros?: number | null }
  cliente?: { nombre?: string | null; primer_apellido?: string | null; apellidos?: string | null; telefono?: string | null }
  descripcion?: string
  observaciones?: string
}

export function ResumenAsistente({ vehiculo, cliente, descripcion, observaciones }: ResumenProps) {
  return (
    <div className="space-y-4">
      <Card className="p-4 divide-y divide-gray-100">
        <div className="pb-3">
          <h3 className="text-xs font-semibold text-gray-500 mb-1">Vehículo</h3>
          {vehiculo ? (
            <p className="text-sm text-gray-900">
              {vehiculo.marca} {vehiculo.modelo} · {vehiculo.matricula}
              {vehiculo.kilometros ? ` · ${vehiculo.kilometros.toLocaleString('es-ES')} km` : ''}
            </p>
          ) : (
            <p className="text-sm text-gray-400">Sin vehículo seleccionado</p>
          )}
        </div>

        <div className="py-3">
          <h3 className="text-xs font-semibold text-gray-500 mb-1">Cliente</h3>
          {cliente ? (
            <p className="text-sm text-gray-900">
              {cliente.nombre} {cliente.primer_apellido || cliente.apellidos || ''}
              {cliente.telefono ? ` · ${cliente.telefono}` : ''}
            </p>
          ) : (
            <p className="text-sm text-gray-400">Sin cliente seleccionado</p>
          )}
        </div>

        <div className="pt-3">
          <h3 className="text-xs font-semibold text-gray-500 mb-1">Trabajo</h3>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">
            {descripcion || 'Sin descripción del problema'}
          </p>
          {observaciones && (
            <>
              <h3 className="text-xs font-semibold text-gray-500 mb-1 mt-3">Observaciones</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{observaciones}</p>
            </>
          )}
        </div>
      </Card>

      <p className="text-xs text-gray-400 text-center px-4">
        Podrás añadir fotos, elementos y más detalles justo después de crear la orden.
      </p>
    </div>
  )
}

interface PieProps {
  paso: Paso
  puedeAvanzar: boolean
  guardando: boolean
  onAtras: () => void
  onSiguiente: () => void
  onGuardar: () => void
}

export function PieAsistente({ paso, puedeAvanzar, guardando, onAtras, onSiguiente, onGuardar }: PieProps) {
  return (
    <div className="bg-white border-t shrink-0 p-3 flex gap-2">
      {paso > 1 && (
        <Button variant="outline" size="xl" className="flex-1" onClick={onAtras}>
          Atrás
        </Button>
      )}
      {paso < 4 ? (
        <Button size="xl" className="flex-1 bg-primary hover:bg-primary/90" disabled={!puedeAvanzar} onClick={onSiguiente}>
          Siguiente
        </Button>
      ) : (
        <Button size="xl" className="flex-1 bg-success hover:bg-success/90 gap-2" disabled={guardando} onClick={onGuardar}>
          {guardando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" /> Guardar Orden
            </>
          )}
        </Button>
      )}
    </div>
  )
}
