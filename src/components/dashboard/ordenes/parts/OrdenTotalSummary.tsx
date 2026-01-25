/**
 * @fileoverview Componente de resumen de totales (SOLO LECTURA)
 * @description Muestra totales pre-calculados por el backend
 *
 * ⚠️ REGLAS CRÍTICAS:
 * - PROHIBIDO hacer cálculos matemáticos (+, -, *, /, %)
 * - PROHIBIDO hardcodear porcentajes de IVA
 * - SOLO formatear números para display
 * - Backend es la única fuente de verdad
 */
'use client'

import { Card } from '@/components/ui/card'
import { TotalesOrdenDTO } from '@/application/dtos/orden.dto'

interface OrdenTotalSummaryProps {
  /** Totales pre-calculados por el backend - NO calcular aquí */
  totales: TotalesOrdenDTO
  /** Clase CSS adicional */
  className?: string
}

/**
 * Formatea un número a formato de moneda española
 * NOTA: Esto NO es un cálculo, solo formateo de string
 */
function formatearMoneda(cantidad: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cantidad)
}

export function OrdenTotalSummary({ totales, className = '' }: OrdenTotalSummaryProps) {
  return (
    <Card className={`p-4 bg-gray-900 text-white ${className}`}>
      <h3 className="text-sm font-semibold mb-3 text-gray-300">Resumen Económico</h3>

      <div className="space-y-2 text-sm">
        {/* Mano de obra */}
        <div className="flex justify-between">
          <span className="text-gray-400">Mano de obra:</span>
          <span className="font-mono">{formatearMoneda(totales.manoObra)}</span>
        </div>

        {/* Recambios */}
        <div className="flex justify-between">
          <span className="text-gray-400">Recambios:</span>
          <span className="font-mono">{formatearMoneda(totales.piezas)}</span>
        </div>

        {/* Servicios */}
        <div className="flex justify-between">
          <span className="text-gray-400">Servicios:</span>
          <span className="font-mono">{formatearMoneda(totales.servicios)}</span>
        </div>

        {/* Subtotal */}
        <div className="border-t border-gray-700 pt-2 flex justify-between">
          <span className="text-gray-400">Subtotal:</span>
          <span className="font-mono">{formatearMoneda(totales.subtotal)}</span>
        </div>

        {/* IVA */}
        <div className="flex justify-between">
          <span className="text-gray-400">IVA:</span>
          <span className="font-mono">{formatearMoneda(totales.iva)}</span>
        </div>

        {/* Retención (si aplica) */}
        {totales.retencion !== undefined && totales.retencion > 0 && (
          <div className="flex justify-between text-orange-400">
            <span>Retención:</span>
            <span className="font-mono">-{formatearMoneda(totales.retencion)}</span>
          </div>
        )}

        {/* Total final */}
        <div className="border-t border-gray-600 pt-2 flex justify-between text-lg font-bold">
          <span>Total:</span>
          <span className="text-green-400 font-mono">{formatearMoneda(totales.total)}</span>
        </div>
      </div>

      {/* Advertencia de desarrollo - remover en producción */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-600 rounded text-xs text-yellow-400">
          ℹ️ Totales calculados en el servidor
        </div>
      )}
    </Card>
  )
}
