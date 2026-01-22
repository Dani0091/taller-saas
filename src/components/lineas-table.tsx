'use client'

import { useState } from 'react'
import { LineaOrden } from '@/lib/ordenes/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, Edit2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
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
  const [formData, setFormData] = useState<{
    tipo: 'mano_obra' | 'pieza' | 'servicio' | 'consumible'
    descripcion: string
    cantidad: number
    precio_unitario: number
    horas: number
    precio_coste: number
    proveedor: string
    referencia: string
  }>({
    tipo: 'mano_obra',
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0,
    horas: 0,
    precio_coste: 0,
    proveedor: '',
    referencia: '',
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
      setFormData({ tipo: 'mano_obra' as 'mano_obra' | 'pieza' | 'servicio' | 'consumible', descripcion: '', cantidad: 1, precio_unitario: 0, horas: 0, precio_coste: 0, proveedor: '', referencia: '' })
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
  const totalCoste = lineas.reduce((sum, l) => sum + (l.cantidad * (l.precio_coste || 0)), 0)
  const beneficioBruto = total - totalCoste

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
              <NumberInput
                value={formData.cantidad}
                onChange={(value) => setFormData({ ...formData, cantidad: value ?? 1 })}
                min={0.01}
                step={1}
                placeholder="1"
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
              <Label className="text-xs sm:text-sm">Precio Venta €</Label>
              <NumberInput
                value={formData.precio_unitario}
                onChange={(value) => setFormData({ ...formData, precio_unitario: value ?? 0 })}
                min={0}
                step={0.01}
                placeholder="0.00"
                className="h-8 sm:h-9 text-xs sm:text-sm"
              />
            </div>
            {formData.tipo === 'mano_obra' && (
              <div>
                <Label className="text-xs sm:text-sm">Horas</Label>
                <NumberInput
                  value={formData.horas}
                  onChange={(value) => setFormData({ ...formData, horas: value ?? 0 })}
                  min={0}
                  step={0.25}
                  placeholder="0.00"
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
            )}
            {(formData.tipo === 'pieza' || formData.tipo === 'consumible') && (
              <div>
                <Label className="text-xs sm:text-sm">Precio Coste €</Label>
                <NumberInput
                  value={formData.precio_coste}
                  onChange={(value) => setFormData({ ...formData, precio_coste: value ?? 0 })}
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
            )}
          </div>

          {/* Campos adicionales para piezas */}
          {(formData.tipo === 'pieza' || formData.tipo === 'consumible') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <Label className="text-xs sm:text-sm">Proveedor</Label>
                <Input
                  value={formData.proveedor}
                  onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                  placeholder="Ej: Recambios García"
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Referencia</Label>
                <Input
                  value={formData.referencia}
                  onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                  placeholder="Ej: OE12345"
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
            </div>
          )}

          {/* Previsualización de margen para piezas */}
          {(formData.tipo === 'pieza' || formData.tipo === 'consumible') && formData.precio_unitario > 0 && (
            <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-xs sm:text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Margen por unidad:</span>
                <span className={formData.precio_unitario - formData.precio_coste >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  €{(formData.precio_unitario - formData.precio_coste).toFixed(2)}
                  {formData.precio_coste > 0 && (
                    <span className="ml-1">
                      ({((formData.precio_unitario - formData.precio_coste) / formData.precio_unitario * 100).toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

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
          lineas.map((linea) => {
            const margen = linea.precio_unitario - (linea.precio_coste || 0)
            const margenTotal = linea.cantidad * margen
            const tieneCoste = (linea.tipo === 'pieza' || linea.tipo === 'consumible') && (linea.precio_coste || 0) > 0

            return (
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
                    {tieneCoste && (
                      <p className="text-green-600">
                        Coste: €{linea.precio_coste?.toFixed(2)} · Margen: €{margenTotal.toFixed(2)}
                      </p>
                    )}
                    {linea.proveedor && (
                      <p className="text-gray-400 text-xs">{linea.proveedor} {linea.referencia && `· ${linea.referencia}`}</p>
                    )}
                  </div>
                  {puedeEditar && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setFormData({
                            tipo: linea.tipo,
                            descripcion: linea.descripcion,
                            cantidad: linea.cantidad,
                            precio_unitario: linea.precio_unitario,
                            horas: linea.horas || 0,
                            precio_coste: linea.precio_coste || 0,
                            proveedor: linea.proveedor || '',
                            referencia: linea.referencia || '',
                          })
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
            )
          })
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
        {totalCoste > 0 && (
          <div className="pt-2 mt-2 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-gray-500">
              <span>Coste piezas:</span>
              <span>€{totalCoste.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-green-600">
              <span>Beneficio bruto:</span>
              <span>€{beneficioBruto.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
