/**
 * @fileoverview Componente Header para detalle de orden
 * @description Header con título, estado y acciones principales
 * REGLAS:
 * - Sin createClient() - solo Server Actions
 * - Sin cálculos matemáticos
 * - Componente pasivo que recibe props
 */
'use client'

import { X, ChevronDown, Check, Lock } from 'lucide-react'
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
            <div className="flex items-center gap-1 text-success">
              <Check className="w-3 h-3" />
              <span className="text-xs">Guardado</span>
            </div>
          )}
        </div>
        <button aria-label="Cerrar" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Selector de estado */}
      <div className="bg-white border-b px-4 py-3 shrink-0">
        <Label className="text-xs text-gray-500 mb-2 block">Estado de la orden</Label>
        <div className="relative">
          {/* Botón neutro con un punto de color: el blanco sobre amarillo, cian o verde
              no se leía (contraste por debajo de 2,5:1) */}
          <button
            onClick={() => !bloqueado && onToggleEstados(!mostrarEstados)}
            disabled={bloqueado}
            aria-haspopup="listbox"
            aria-expanded={mostrarEstados}
            className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border bg-card text-foreground shadow-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${bloqueado ? 'cursor-not-allowed bg-muted hover:bg-muted' : ''}`}
          >
            <span className="flex items-center gap-2.5 font-medium">
              <span aria-hidden className={`size-2.5 rounded-full ${estadoActual.color}`} />
              {estadoActual.label}
            </span>
            {bloqueado ? (
              <Lock className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${mostrarEstados ? 'rotate-180' : ''}`} />
            )}
          </button>

          {bloqueado && (
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Orden facturada — el estado ya no se puede cambiar
            </p>
          )}

          {!bloqueado && mostrarEstados && (
            <div role="listbox" aria-label="Estado de la orden" className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-xl shadow-lg border z-10 overflow-hidden max-h-64 overflow-y-auto animate-in fade-in-0 slide-in-from-top-1 duration-150">
              {ESTADOS_ORDEN.map(estado => (
                <button
                  key={estado.value}
                  role="option"
                  aria-selected={estadoValue === estado.value}
                  onClick={() => cambiarEstado(estado.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors ${
                    estadoValue === estado.value ? 'bg-muted' : ''
                  }`}
                >
                  <span aria-hidden className={`size-2.5 rounded-full ${estado.color}`} />
                  <span className="flex-1 text-left font-medium">{estado.label}</span>
                  {estadoValue === estado.value && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

    </>
  )
}
