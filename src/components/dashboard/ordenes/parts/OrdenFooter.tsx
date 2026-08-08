/**
 * @fileoverview Footer de la Orden (Acciones finales)
 * @description Botones de acción: Compartir, Imprimir, Calendar, Factura, Guardar
 * REGLAS:
 * - Componente pasivo que recibe props y callbacks
 * - Todas las acciones mediante callbacks
 */
'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loader2, Share2, Copy, Link, Printer, FileText, ChevronDown, Save, Zap } from 'lucide-react'
import { GoogleCalendarButton } from '../google-calendar-button'
import { ESTADOS_FACTURABLES } from '@/lib/constants'

interface Cliente {
  id: string
  nombre: string
}

interface VehiculoSeleccionado {
  marca: string
  modelo: string
  matricula: string
}

interface OrdenFooterProps {
  // Flags de estado
  modoCrear: boolean
  ordenSeleccionada: string | null | undefined
  guardando: boolean
  compartiendo: boolean
  generandoFactura: boolean

  // Datos
  ordenNumero: string
  enlacePresupuesto: string | null
  clienteId: string
  estado: string
  descripcionProblema?: string
  trabajosRealizados?: string
  fechaPrevistaEntrega?: string | null
  clientes: Cliente[]
  vehiculoSeleccionado?: VehiculoSeleccionado | null

  // Callbacks de acciones
  onCompartirPresupuesto: () => void
  onCopiarEnlace: () => void
  onEnviarWhatsApp: () => void
  onMostrarPDF: () => void
  onCrearBorradorFactura: () => void
  onEmitirFacturaDirecta: () => void
  onCobroRapido: () => void
  totalOrden: number
  onGuardar: () => void
  onClose: () => void

  // Selección de serie de facturación (RS, SCR, ALP, FS...)
  seriesDisponibles?: { id: string; nombre: string; prefijo: string; es_predeterminada: boolean }[]
  serieSeleccionada?: string
  onSerieChange?: (prefijo: string) => void
}

export function OrdenFooter({
  modoCrear,
  ordenSeleccionada,
  guardando,
  compartiendo,
  generandoFactura,
  ordenNumero,
  enlacePresupuesto,
  clienteId,
  estado,
  descripcionProblema,
  trabajosRealizados,
  fechaPrevistaEntrega,
  clientes,
  vehiculoSeleccionado,
  onCompartirPresupuesto,
  onCopiarEnlace,
  onEnviarWhatsApp,
  onMostrarPDF,
  onCrearBorradorFactura,
  onEmitirFacturaDirecta,
  onCobroRapido,
  totalOrden,
  onGuardar,
  onClose,
  seriesDisponibles = [],
  serieSeleccionada,
  onSerieChange,
}: OrdenFooterProps) {
  return (
    <div className="bg-white border-t p-4 space-y-2 shrink-0">
      {/* Compartir presupuesto con cliente */}
      {!modoCrear && ordenSeleccionada && (
        <div className="space-y-2">
          {!enlacePresupuesto ? (
            <Button
              onClick={onCompartirPresupuesto}
              disabled={compartiendo}
              variant="outline"
              className="w-full gap-2 py-3 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              {compartiendo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              {compartiendo ? 'Generando enlace...' : 'Enviar Presupuesto al Cliente'}
            </Button>
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
              <p className="text-xs text-purple-700 font-medium">Enlace del presupuesto:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={enlacePresupuesto}
                  readOnly
                  className="flex-1 text-xs bg-white border rounded-lg px-2 py-1.5 font-mono truncate"
                />
                <Button size="sm" variant="outline" onClick={onCopiarEnlace} className="gap-1">
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onEnviarWhatsApp}
                  className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
                >
                  <Share2 className="w-3 h-3" />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(enlacePresupuesto, '_blank')}
                  className="flex-1 gap-1"
                >
                  <Link className="w-3 h-3" />
                  Abrir
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón para imprimir orden completa */}
      {!modoCrear && ordenSeleccionada && (
        <Button
          onClick={onMostrarPDF}
          variant="outline"
          className="w-full gap-2 py-3"
        >
          <Printer className="w-4 h-4" />
          Ver / Imprimir Orden Completa
        </Button>
      )}

      {/* Añadir a Google Calendar */}
      {!modoCrear && ordenSeleccionada && (
        <div className="flex justify-center">
          <GoogleCalendarButton
            ordenId={ordenSeleccionada}
            titulo={`Orden ${ordenNumero}`}
            descripcion={descripcionProblema || trabajosRealizados}
            fechaEntrega={fechaPrevistaEntrega}
            clienteNombre={clientes.find(c => c.id === clienteId)?.nombre}
            vehiculoInfo={vehiculoSeleccionado ? `${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo} - ${vehiculoSeleccionado.matricula}` : undefined}
          />
        </div>
      )}

      {/* Selector de serie de facturación (solo si el taller tiene más de una configurada) */}
      {!modoCrear && estado !== 'facturado' && ESTADOS_FACTURABLES.includes(estado as any) && seriesDisponibles.length > 1 && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Serie de facturación</label>
          <select
            value={serieSeleccionada || ''}
            onChange={(e) => onSerieChange?.(e.target.value)}
            className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white text-sm"
          >
            {seriesDisponibles.map(s => (
              <option key={s.id} value={s.prefijo}>
                {s.prefijo} — {s.nombre}{s.es_predeterminada ? ' (predeterminada)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Cobro Rápido — Factura simplificada (< 3000€) */}
      {!modoCrear && estado !== 'facturado' && ESTADOS_FACTURABLES.includes(estado as any) && totalOrden > 0 && totalOrden < 3000 && (
        <Button
          onClick={onCobroRapido}
          disabled={generandoFactura || guardando}
          className="w-full gap-3 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 py-5 text-lg font-bold min-h-[56px] shadow-md"
        >
          {generandoFactura ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Zap className="w-5 h-5" />
          )}
          {generandoFactura ? 'Procesando...' : `Cobro Rápido — ${totalOrden.toFixed(2)} €`}
        </Button>
      )}

      {/* Generar Factura */}
      {!modoCrear && estado !== 'facturado' && ESTADOS_FACTURABLES.includes(estado as any) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={generandoFactura || guardando}
              className="w-full gap-2 bg-green-600 hover:bg-green-700 py-3"
            >
              {generandoFactura ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {generandoFactura ? 'Generando...' : 'Generar Factura'}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            <DropdownMenuItem onClick={onCrearBorradorFactura} className="gap-2">
              📝 Crear Borrador Editable
              <span className="text-xs text-gray-500 ml-auto">Modificar antes de emitir</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEmitirFacturaDirecta} className="gap-2">
              ⚡ Emitir Factura Directa
              <span className="text-xs text-gray-500 ml-auto">Sin opción de edición</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Botones Cancelar/Guardar */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 py-3"
        >
          Cancelar
        </Button>
        <Button
          onClick={onGuardar}
          disabled={guardando || !clienteId || estado === 'facturado'}
          className="flex-1 gap-2 py-3 bg-sky-600 hover:bg-sky-700"
        >
          {guardando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {guardando
            ? 'Guardando...'
            : estado === 'facturado'
              ? 'Orden facturada (bloqueada)'
              : (modoCrear ? 'Crear Orden' : 'Guardar Cambios')}
        </Button>
      </div>
    </div>
  )
}
