/**
 * @fileoverview Paso 3 del wizard de creación de orden — descripción y observaciones
 * @description Componente pasivo: recibe props y callbacks, sin SQL directo
 */
'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface OrdenDescripcionStepProps {
  descripcionProblema: string
  observaciones: string
  onDescripcionChange: (value: string) => void
  onObservacionesChange: (value: string) => void
}

export function OrdenDescripcionStep({
  descripcionProblema,
  observaciones,
  onDescripcionChange,
  onObservacionesChange,
}: OrdenDescripcionStepProps) {
  return (
    <>
      <Card className="p-4">
        <Label className="text-sm font-semibold mb-2 block">
          Descripción del problema *
        </Label>
        <Textarea
          value={descripcionProblema}
          onChange={(e) => onDescripcionChange(e.target.value)}
          placeholder="Describe el problema que presenta el vehículo..."
          rows={4}
          className="resize-none text-base"
          autoFocus
        />
      </Card>

      <Card className="p-4">
        <Label className="text-sm font-semibold mb-2 block">
          Observaciones <span className="text-gray-400 font-normal">(opcional)</span>
        </Label>
        <Textarea
          value={observaciones}
          onChange={(e) => onObservacionesChange(e.target.value)}
          placeholder="Cualquier detalle adicional del cliente o del vehículo..."
          rows={3}
          className="resize-none text-base"
        />
      </Card>
    </>
  )
}
