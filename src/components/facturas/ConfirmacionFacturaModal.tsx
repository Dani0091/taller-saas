'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ConfirmacionFacturaModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  facturaData: {
    cliente: { nombre: string; nif?: string }
    vehiculo?: { matricula?: string; marca?: string; modelo?: string } | null
    lineas: Array<{ descripcion: string; cantidad: number; precio: number }>
    base: number
    iva: number
    total: number
  }
  isLoading?: boolean
}

export default function ConfirmacionFacturaModal({
  isOpen,
  onClose,
  onConfirm,
  facturaData,
  isLoading = false,
}: ConfirmacionFacturaModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>✓ Confirmar Emisión de Factura</AlertDialogTitle>
          <AlertDialogDescription>
            Revisa los datos antes de emitir
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
          {/* CLIENTE */}
          <div className="border-b pb-3">
            <h3 className="font-semibold text-sm mb-2">👤 Cliente</h3>
            <p className="text-sm font-medium">{facturaData.cliente.nombre}</p>
            {facturaData.cliente.nif && (
              <p className="text-xs text-gray-500">NIF: {facturaData.cliente.nif}</p>
            )}
          </div>

          {/* VEHÍCULO */}
          {facturaData.vehiculo?.matricula && (
            <div className="border-b pb-3">
              <h3 className="font-semibold text-sm mb-2">🚗 Vehículo</h3>
              <p className="text-sm font-mono font-bold text-blue-600">
                {facturaData.vehiculo.matricula}
              </p>
              {facturaData.vehiculo.marca && (
                <p className="text-xs text-gray-600">
                  {facturaData.vehiculo.marca} {facturaData.vehiculo.modelo || ''}
                </p>
              )}
            </div>
          )}

          {/* LÍNEAS */}
          <div className="border-b pb-3">
            <h3 className="font-semibold text-sm mb-2">
              📋 Líneas ({facturaData.lineas.length})
            </h3>
            <div className="space-y-2">
              {facturaData.lineas.map((linea, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-xs p-2 bg-gray-50 rounded"
                >
                  <div className="flex-1">
                    <p className="font-medium">{linea.descripcion}</p>
                    <p className="text-gray-500">
                      {linea.cantidad} x €{linea.precio.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right font-semibold">
                    €{(linea.cantidad * linea.precio).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TOTALES */}
          <div className="bg-blue-50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Base:</span>
              <span className="font-semibold">€{facturaData.base.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IVA (21%):</span>
              <span className="font-semibold">€{facturaData.iva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg">
              <span className="font-bold">TOTAL:</span>
              <span className="font-bold text-blue-600">
                €{facturaData.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* TIMESTAMP */}
          <p className="text-xs text-gray-400 text-center">
            {format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <AlertDialogCancel disabled={isLoading}>
            ✗ Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? '⏳ Emitiendo...' : '✅ Confirmar y Emitir'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
