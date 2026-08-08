/**
 * @fileoverview Componente Header para detalle de orden
 * @description Header con título, estado y acciones principales
 * REGLAS:
 * - Sin createClient() - solo Server Actions
 * - Sin cálculos matemáticos
 * - Componente pasivo que recibe props
 */
'use client'

import { X, ChevronDown, Check, Printer, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ESTADOS_ORDEN } from '@/lib/constants'

interface OrdenHeaderProps {
  // Datos de la orden
  modoCrear: boolean
  ordenNumero: string
  guardadoAutomatico: boolean

  // Estado
  estadoActual: string
  onCambiarEstado: (nuevoEstado: string) => void

  // Acciones
  onClose: () => void
  onImprimir?: () => void

  // UI State
  mostrarEstados: boolean
  onToggleEstados: (value: boolean) => void

  /** Orden facturada (emitida) — el estado ya no se puede cambiar manualmente */
  bloqueado?: boolean
}

export function OrdenHeader({
  modoCrear,
  ordenNumero,
  guardadoAutomatico,
  estadoActual: estadoValue,
  onCambiarEstado,
  onClose,
  onImprimir,
  mostrarEstados,
  onToggleEstados,
  bloqueado = false,
}: OrdenHeaderProps) {
  const estadoActual = ESTADOS_ORDEN.find(e => e.value === estadoValue) || ESTADOS_ORDEN[0]

  const cambiarEstado = (nuevoEstado: string) => {
    onCambiarEstado(nuevoEstado)
    onToggleEstados(false)
  }

  return (
    <>
      {/* Header con título y cerrar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {modoCrear ? 'Nueva Orden' : ordenNumero}
            </h2>
            <p className="text-xs text-gray-500">
              {modoCrear ? 'Crear nueva orden de trabajo' : 'Editar orden'}
            </p>
          </div>
          {/* Solo se muestra justo tras un guardado exitoso — en reposo no se muestra nada,
              para no sugerir que hay un guardado en curso cuando no lo hay */}
          {!modoCrear && guardadoAutomatico && (
            <div className="flex items-center gap-1 text-green-600">
              <Check className="w-3 h-3" />
              <span className="text-xs">Guardado</span>
            </div>
          )}
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Selector de estado */}
      <div className="bg-white border-b px-4 py-3 shrink-0">
        <Label className="text-xs text-gray-500 mb-2 block">Estado de la orden</Label>
        <div className="relative">
          <button
            onClick={() => !bloqueado && onToggleEstados(!mostrarEstados)}
            disabled={bloqueado}
            className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 transition-all ${estadoActual.color} text-white ${bloqueado ? 'opacity-90 cursor-not-allowed' : ''}`}
          >
            <span className="flex items-center gap-2 font-medium">
              <span>{estadoActual.icon}</span>
              {estadoActual.label}
            </span>
            {bloqueado ? (
              <Lock className="w-4 h-4" />
            ) : (
              <ChevronDown className={`w-5 h-5 transition-transform ${mostrarEstados ? 'rotate-180' : ''}`} />
            )}
          </button>

          {bloqueado && (
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Orden facturada — el estado ya no se puede cambiar
            </p>
          )}

          {!bloqueado && mostrarEstados && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border z-10 overflow-hidden max-h-64 overflow-y-auto">
              {ESTADOS_ORDEN.map(estado => (
                <button
                  key={estado.value}
                  onClick={() => cambiarEstado(estado.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                    estadoValue === estado.value ? 'bg-gray-100' : ''
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${estado.color}`} />
                  <span className="flex-1 text-left font-medium">{estado.label}</span>
                  {estadoValue === estado.value && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Botón de imprimir */}
      {!modoCrear && onImprimir && (
        <div className="bg-white border-b px-4 py-3 shrink-0">
          <Button
            onClick={onImprimir}
            variant="outline"
            className="w-full gap-2"
            size="sm"
          >
            <Printer className="w-4 h-4" />
            Ver / Imprimir Orden
          </Button>
        </div>
      )}
    </>
  )
}
