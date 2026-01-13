/**
 * COMPONENTE CAMBIAR ESTADO FACTURA
 * 
 * Permite cambiar el estado de una factura
 * Flujo: borrador → emitida → pagada (o anulada)
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CambiarEstadoProps {
  facturaId: string
  estadoActual: 'borrador' | 'emitida' | 'pagada' | 'anulada'
  onEstadoActualizado: (nuevoEstado: string) => void
}

const estadoColores: Record<string, string> = {
  'borrador': 'bg-gray-100 text-gray-800',
  'emitida': 'bg-blue-100 text-blue-800',
  'pagada': 'bg-green-100 text-green-800',
  'anulada': 'bg-red-100 text-red-800',
}

const flujoEstados: Record<string, string[]> = {
  'borrador': ['emitida', 'anulada'],
  'emitida': ['pagada', 'anulada'],
  'pagada': ['anulada'],
  'anulada': [],
}

const descripcionEstados: Record<string, string> = {
  'borrador': 'Factura en borrador, sin enviar',
  'emitida': 'Factura emitida y registrada en AEAT',
  'pagada': 'Factura pagada completamente',
  'anulada': 'Factura anulada (no se puede recuperar)',
}

export function CambiarEstado({
  facturaId,
  estadoActual,
  onEstadoActualizado,
}: CambiarEstadoProps) {
  const [cargando, setCargando] = useState(false)
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string | null>(null)

  const estadosDisponibles = flujoEstados[estadoActual] || []

  const handleCambiarEstado = async (nuevoEstado: string) => {
    if (!confirm(`¿Cambiar estado a "${nuevoEstado}"? Esta acción no se puede deshacer.`)) {
      return
    }

    setCargando(true)
    try {
      const response = await fetch(`/api/facturas/actualizar?id=${facturaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: nuevoEstado,
        }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success(`Estado actualizado a "${nuevoEstado}"`)
        onEstadoActualizado(nuevoEstado)
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al cambiar estado')
    } finally {
      setCargando(false)
    }
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
      <div className="space-y-4">
        {/* ESTADO ACTUAL */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Estado Actual</p>
          <div className="flex items-center gap-3">
            <Badge className={estadoColores[estadoActual]}>
              {estadoActual.toUpperCase()}
            </Badge>
            <p className="text-sm text-gray-600">{descripcionEstados[estadoActual]}</p>
          </div>
        </div>

        {/* TRANSICIONES DISPONIBLES */}
        {estadosDisponibles.length > 0 ? (
          <div className="pt-4 border-t border-purple-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Cambiar a:
            </p>
            <div className="space-y-2">
              {estadosDisponibles.map((nuevoEstado) => (
                <button
                  key={nuevoEstado}
                  onClick={() => handleCambiarEstado(nuevoEstado)}
                  disabled={cargando}
                  className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-purple-200 hover:bg-white hover:border-purple-400 transition disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">
                      {nuevoEstado.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-600">
                      {descripcionEstados[nuevoEstado]}
                    </p>
                  </div>
                  {cargando ? (
                    <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-purple-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-purple-200">
            <p className="text-sm text-gray-600 italic">
              No hay transiciones disponibles desde este estado
            </p>
          </div>
        )}

        {/* NOTA LEGAL */}
        <div className="pt-4 border-t border-purple-200">
          <p className="text-xs text-gray-600">
            <span className="font-semibold">Nota:</span> Los cambios de estado quedan 
            registrados en la auditoría. Solo administradores pueden revertir cambios.
          </p>
        </div>
      </div>
    </Card>
  )
}
