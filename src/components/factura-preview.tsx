'use client'

interface FacturaPreviewProps {
  tarifaHora: number
  horasReales: number
  totalPiezas: number
  includeIva: boolean
  porcentajeIva: number
  tarifaConIva: boolean
}

export function FacturaPreview({
  tarifaHora,
  horasReales,
  totalPiezas,
  includeIva,
  porcentajeIva,
  tarifaConIva,
}: FacturaPreviewProps) {
  // Calcular base de mano de obra
  const manoObraTotal = tarifaHora * horasReales

  // Si la tarifa viene con IVA, hay que desglosaría
  const manoObraBase = tarifaConIva
    ? manoObraTotal / (1 + porcentajeIva / 100)
    : manoObraTotal

  const manoObraIva = manoObraBase * (porcentajeIva / 100)

  // Subtotal (base imponible)
  const subtotal = manoObraBase + totalPiezas

  // IVA total
  const ivaTotal = subtotal * (porcentajeIva / 100)

  // Total con IVA
  const totalConIva = subtotal + ivaTotal

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-bold text-lg mb-4">Preview Factura</h3>

      {/* Tabla de desglose */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="text-left py-2 px-2 font-semibold">Concepto</th>
              <th className="text-center py-2 px-2 font-semibold">Cantidad</th>
              <th className="text-right py-2 px-2 font-semibold">Precio Unit.</th>
              <th className="text-right py-2 px-2 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {horasReales > 0 && (
              <tr className="border-b">
                <td className="py-3 px-2">Mano de Obra</td>
                <td className="text-center py-3 px-2">{horasReales.toFixed(1)}h</td>
                <td className="text-right py-3 px-2">
                  €{tarifaConIva ? (tarifaHora / (1 + porcentajeIva / 100)).toFixed(2) : tarifaHora.toFixed(2)}
                </td>
                <td className="text-right py-3 px-2 font-semibold">€{manoObraBase.toFixed(2)}</td>
              </tr>
            )}

            {totalPiezas > 0 && (
              <tr className="border-b">
                <td className="py-3 px-2">Piezas y Materiales</td>
                <td className="text-center py-3 px-2">—</td>
                <td className="text-right py-3 px-2">—</td>
                <td className="text-right py-3 px-2 font-semibold">€{totalPiezas.toFixed(2)}</td>
              </tr>
            )}

            {/* Subtotal */}
            <tr className="border-t-2 bg-gray-50 font-bold">
              <td colSpan={3} className="py-3 px-2 text-right">
                Subtotal (Base):
              </td>
              <td className="text-right py-3 px-2">€{subtotal.toFixed(2)}</td>
            </tr>

            {/* IVA */}
            {includeIva && (
              <tr className="border-b bg-orange-50">
                <td colSpan={3} className="py-3 px-2 text-right font-semibold">
                  IVA ({porcentajeIva.toFixed(2)}%):
                </td>
                <td className="text-right py-3 px-2 font-semibold text-orange-600">
                  €{ivaTotal.toFixed(2)}
                </td>
              </tr>
            )}

            {/* Total */}
            <tr className="border-t-2 bg-green-50 font-bold text-lg">
              <td colSpan={3} className="py-3 px-2 text-right">
                TOTAL:
              </td>
              <td className="text-right py-3 px-2 text-green-600">
                €{(includeIva ? totalConIva : subtotal).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Resumen de cálculos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-gray-600 text-xs uppercase font-semibold">Mano de Obra</p>
          <p className="text-xl font-bold text-blue-600 mt-1">€{manoObraBase.toFixed(2)}</p>
        </div>

        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-gray-600 text-xs uppercase font-semibold">Piezas</p>
          <p className="text-xl font-bold text-purple-600 mt-1">€{totalPiezas.toFixed(2)}</p>
        </div>

        {includeIva && (
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-gray-600 text-xs uppercase font-semibold">IVA</p>
            <p className="text-xl font-bold text-orange-600 mt-1">€{ivaTotal.toFixed(2)}</p>
          </div>
        )}

        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-gray-600 text-xs uppercase font-semibold">Total</p>
          <p className="text-xl font-bold text-green-600 mt-1">
            €{(includeIva ? totalConIva : subtotal).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  )
}
