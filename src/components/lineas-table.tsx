'use client'

import { useState } from 'react'
import { LineaOrden } from '@/lib/ordenes/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, Edit2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface LineasTableProps {
  lineas: LineaOrden[]
  puedeEditar: boolean
  onAgregar: (linea: Partial<LineaOrden>) => Promise<void>
  onEliminar: (id: string) => Promise<void>
  onActualizar: (id: string, updates: Partial<LineaOrden>) => Promise<void>
}

export function LineasTable({
  lineas,
  puedeEditar,
  onAgregar,
  onEliminar,
  onActualizar,
}: LineasTableProps) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    tipo: 'mano_obra' as const,
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0,
    horas: 0,
  })

  const handleSubmit = async () => {
    if (!formData.descripcion || formData.precio_unitario <= 0) {
      toast.error('Completa los campos requeridos')
      return
    }

    setLoading(true)
    try {
      if (editingId) {
        await onActualizar(editingId, formData)
        toast.success('✅ Línea actualizada')
        setEditingId(null)
      } else {
        await onAgregar(formData)
        toast.success('✅ Línea agregada')
      }
      setFormData({ tipo: 'mano_obra', descripcion: '', cantidad: 1, precio_unitario: 0, horas: 0 })
      setShowForm(false)
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta línea?')) return
    
    setLoading(true)
    try {
      await onEliminar(id)
      toast.success('✅ Línea eliminada')
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const total = lineas.reduce((sum, l) => sum + l.importe_total, 0)
  const totalConIva = total * 1.21

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-sm sm:text-base">Líneas de Trabajo</h2>
        {puedeEditar && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700 h-8 sm:h-9 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div>
              <Label className="text-xs sm:text-sm">Tipo</Label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                className="w-full px-2 py-1 sm:px-3 sm:py-2 border rounded text-xs sm:text-sm"
              >
                <option value="mano_obra">Mano de Obra</option>
                <option value="pieza">Pieza</option>
                <option value="servicio">Servicio</option>
                <option value="consumible">Consumible</option>
              </select>
            </div>
            <div>
              <Label className="text-xs sm:text-sm">Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: parseFloat(e.target.value) })}
                className="h-8 sm:h-9 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs sm:text-sm">Descripción</Label>
            <Input
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Ej: Cambio de aceite"
              className="h-8 sm:h-9 text-xs sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div>
              <Label className="text-xs sm:text-sm">Precio Unitario €</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.precio_unitario}
                onChange={(e) => setFormData({ ...formData, precio_unitario: parseFloat(e.target.value) })}
                className="h-8 sm:h-9 text-xs sm:text-sm"
              />
            </div>
            {formData.tipo === 'mano_obra' && (
              <div>
                <Label className="text-xs sm:text-sm">Horas</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.horas}
                  onChange={(e) => setFormData({ ...formData, horas: parseFloat(e.target.value) })}
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs sm:text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-8 text-xs sm:text-sm"
            >
              {editingId ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {lineas.length === 0 ? (
          <p className="text-center text-gray-500 py-4 text-xs sm:text-sm">Sin líneas agregadas</p>
        ) : (
          lineas.map((linea) => (
            <div
              key={linea.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs sm:text-sm"
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{linea.descripcion}</p>
                  <p className="text-gray-600">
                    {linea.cantidad} x €{linea.precio_unitario.toFixed(2)} = €{linea.importe_total.toFixed(2)}
                  </p>
                  {linea.horas && <p className="text-gray-500">{linea.horas}h</p>}
                </div>
                {puedeEditar && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFormData({ ...linea, tipo: linea.tipo as any })
                        setEditingId(linea.id)
                        setShowForm(true)
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEliminar(linea.id)}
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-gray-200 space-y-1 text-xs sm:text-sm">
        <div className="flex justify-between font-semibold">
          <span>Subtotal:</span>
          <span>€{total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>IVA 21%:</span>
          <span>€{(total * 0.21).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg">
          <span>Total:</span>
          <span className="text-blue-600">€{totalConIva.toFixed(2)}</span>
        </div>
      </div>
    </Card>
  )
}
