'use client'

import { Button } from '@/components/ui/button'
import { Check, Clock, AlertCircle, X } from 'lucide-react'

interface EstadoButtonsProps {
  estadoActual: string
  onCambiarEstado: (estado: string) => Promise<void>
  loading?: boolean
}

const FLUJO_ESTADOS = {
  recibido: { siguiente: 'diagnostico', label: '🔍 Diagnóstico', icon: Clock },
  diagnostico: { siguiente: 'en_progreso', label: '🔧 Comenzar', icon: Check },
  en_progreso: { siguiente: 'completado', label: '✅ Finalizar', icon: Check },
  pendiente_cliente: { siguiente: 'en_progreso', label: '🔧 Continuar', icon: Check },
  completado: null,
  cancelado: null,
}

export function EstadoButtons({
  estadoActual,
  onCambiarEstado,
  loading = false,
}: EstadoButtonsProps) {
  const flujo = FLUJO_ESTADOS[estadoActual as keyof typeof FLUJO_ESTADOS]

  if (!flujo) {
    return (
      <div className="p-3 sm:p-4 bg-gray-100 rounded-lg text-center">
        <p className="text-xs sm:text-sm font-semibold text-gray-700">
          Orden {estadoActual === 'completado' ? 'Finalizada' : 'Cancelada'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <Button
        onClick={() => onCambiarEstado(flujo.siguiente)}
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 text-xs sm:text-sm py-2 sm:py-3"
      >
        <Check className="w-4 h-4 mr-1 sm:mr-2" />
        <span>{flujo.label}</span>
      </Button>
      
      <Button
        onClick={() => onCambiarEstado('cancelado')}
        disabled={loading}
        variant="outline"
        className="w-full text-xs sm:text-sm py-2 sm:py-3"
      >
        <X className="w-4 h-4 mr-1 sm:mr-2" />
        <span>Cancelar</span>
      </Button>
    </div>
  )
}
