/**
 * @fileoverview Componente TablaTrabajos - SANEADO
 * @description Tabla para entrada de líneas de orden (solo INPUT, sin cálculos)
 *
 * ✅ SANEADO: Sin cálculos matemáticos, sin hooks de cálculo
 * ❌ ELIMINADO: useOrderCalculations, cálculos de IVA, totales
 * ✅ Solo muestra precios unitarios, NO calcula totales
 */

'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit2, Copy, Wrench, Package, Zap, DollarSign, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Badge } from '@/components/ui/badge'
import type { LineaOrden, TipoLinea } from '@/types/workshop'

interface TablaTrabajosProps {
  lineas: LineaOrden[]
  onAgregarLinea: (linea: Omit<LineaOrden, 'id'>) => void
  onActualizarLinea: (id: string, updates: Partial<LineaOrden>) => void
  onEliminarLinea: (id: string) => void
  readonly?: boolean
  compact?: boolean
}

/**
 * Tabla para gestionar líneas de orden
 * IMPORTANTE: Este componente NO calcula totales. Solo permite entrada de datos.
 */
export function TablaTrabajos({
  lineas,
  onAgregarLinea,
  onActualizarLinea,
  onEliminarLinea,
  readonly = false,
  compact = false
}: TablaTrabajosProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nuevaLinea, setNuevaLinea] = useState<Partial<LineaOrden>>({
    tipo: 'mano_obra',
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0,
    estado: 'presupuestado'
  })

  const tiposLinea: { value: TipoLinea; label: string; icon: React.ReactNode }[] = [
    { value: 'mano_obra', label: 'Mano de Obra', icon: <Wrench className="h-3 w-3" /> },
    { value: 'pieza', label: 'Pieza', icon: <Package className="h-3 w-3" /> },
    { value: 'servicio', label: 'Servicio', icon: <Zap className="h-3 w-3" /> },
    { value: 'suplido', label: 'Suplido', icon: <DollarSign className="h-3 w-3" /> },
    { value: 'reembolso', label: 'Reembolso', icon: <Clock className="h-3 w-3" /> }
  ]

  const getTipoInfo = (tipo: TipoLinea) => {
    return tiposLinea.find(t => t.value === tipo) || tiposLinea[0]
  }

  const handleAgregarLinea = () => {
    if (!nuevaLinea.descripcion || !nuevaLinea.cantidad || nuevaLinea.precio_unitario === undefined) {
      return
    }

    onAgregarLinea(nuevaLinea as Omit<LineaOrden, 'id'>)
    setNuevaLinea({
      tipo: 'mano_obra',
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      estado: 'presupuestado'
    })
    setMostrarFormulario(false)
  }

  return (
    <Card className={`${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`font-semibold ${compact ? 'text-sm' : ''}`}>
          Trabajos y Conceptos
        </h3>

        <div className="flex items-center gap-4">
          {!readonly && (
            <Button
              size={compact ? "sm" : "default"}
              onClick={() => setMostrarFormulario(!mostrarFormulario)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          )}

          <div className="text-sm text-gray-600">
            <span className="font-medium">{lineas.length}</span> líneas
          </div>
        </div>
      </div>

      {/* Formulario para nueva línea */}
      {!readonly && mostrarFormulario && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-1 gap-4">
            {/* Fila 1: Tipo y Descripción (más ancha) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={nuevaLinea.tipo}
                  onChange={(e) => setNuevaLinea(prev => ({
                    ...prev,
                    tipo: e.target.value as TipoLinea
                  }))}
                  className="w-full px-3 py-2 border rounded"
                >
                  {tiposLinea.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-9">
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <Input
                  value={nuevaLinea.descripcion || ''}
                  onChange={(e) => setNuevaLinea(prev => ({
                    ...prev,
                    descripcion: e.target.value
                  }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAgregarLinea()
                    }
                  }}
                  placeholder="Descripción del trabajo/pieza"
                  className="w-full"
                  autoFocus
                />
              </div>
            </div>

            {/* Fila 2: Cantidad, Precio y Botones */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Cantidad</label>
                <NumberInput
                  value={nuevaLinea.cantidad || 1}
                  onChange={(value) => setNuevaLinea(prev => ({
                    ...prev,
                    cantidad: value ?? 1
                  }))}
                  onBlur={() => {
                    // Auto-completar cantidad a 1 si está vacío
                    if (!nuevaLinea.cantidad) {
                      setNuevaLinea(prev => ({ ...prev, cantidad: 1 }))
                    }
                  }}
                  min={0.01}
                  step={nuevaLinea.tipo === 'mano_obra' ? 0.25 : 1}
                  className="w-full"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Precio/Unidad (€)</label>
                <NumberInput
                  value={nuevaLinea.precio_unitario || 0}
                  onChange={(value) => setNuevaLinea(prev => ({
                    ...prev,
                    precio_unitario: value ?? 0
                  }))}
                  min={0}
                  step={0.01}
                  className="w-full text-right"
                />
              </div>

              <div className="md:col-span-6 flex gap-2">
                <Button onClick={handleAgregarLinea} className="flex-1">
                  Agregar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMostrarFormulario(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de líneas */}
      {lineas.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No hay líneas agregadas</p>
        </div>
      ) : (
        <>
          {/* Vista de TARJETAS en MÓVIL (< 640px) - Mejor UX táctil */}
          <div className="sm:hidden space-y-3">
            {lineas.map((linea) => {
              const tipoInfo = getTipoInfo(linea.tipo)
              return (
                <div key={linea.id} className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {tipoInfo.icon} {tipoInfo.label}
                    </Badge>
                    {!readonly && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditandoId(linea.id!)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEliminarLinea(linea.id!)}
                          className="h-8 w-8 p-0 text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-sm mb-3">{linea.descripcion}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500 text-xs block mb-1">Cantidad</span>
                      <p className="font-semibold text-base">{linea.cantidad}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500 text-xs block mb-1">Precio/U</span>
                      <p className="font-semibold text-base text-green-700">€{(linea.precio_unitario || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Vista de TABLA en DESKTOP (>= 640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className={`w-full ${compact ? 'text-sm' : ''}`}>
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Tipo</th>
                  <th className="text-left py-2">Descripción</th>
                  <th className="text-right py-2">Cantidad</th>
                  <th className="text-right py-2">Precio/U</th>
                  {!readonly && <th className="text-center py-2">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {lineas.map((linea) => {
                  const tipoInfo = getTipoInfo(linea.tipo)

                  return (
                    <tr key={linea.id} className="border-b hover:bg-gray-50">
                    <td className="py-3">
                      <Badge variant="secondary" className="text-xs">
                        {tipoInfo.icon} {tipoInfo.label}
                      </Badge>
                    </td>

                    <td className="py-3 min-w-[200px]">
                      {editandoId === linea.id ? (
                        <Input
                          value={linea.descripcion}
                          onChange={(e) => onActualizarLinea(linea.id!, {
                            descripcion: e.target.value
                          })}
                          className="w-full"
                          autoFocus
                        />
                      ) : (
                        <span>{linea.descripcion}</span>
                      )}
                    </td>

                    <td className="text-right py-3 min-w-[100px]">
                      {editandoId === linea.id ? (
                        <NumberInput
                          value={linea.cantidad}
                          onChange={(value) => onActualizarLinea(linea.id!, {
                            cantidad: value ?? 1
                          })}
                          min={0.01}
                          step={linea.tipo === 'mano_obra' ? 0.25 : 1}
                          className="w-full text-right"
                        />
                      ) : (
                        <span>{linea.cantidad}</span>
                      )}
                    </td>

                    <td className="text-right py-3 min-w-[120px]">
                      {editandoId === linea.id ? (
                        <NumberInput
                          value={linea.precio_unitario}
                          onChange={(value) => onActualizarLinea(linea.id!, {
                            precio_unitario: value ?? 0
                          })}
                          min={0}
                          step={0.01}
                          className="w-full text-right"
                        />
                      ) : (
                        <span className="whitespace-nowrap">€{(linea.precio_unitario || 0).toFixed(2)}</span>
                      )}
                    </td>

                    {!readonly && (
                      <td className="text-center py-3">
                        <div className="flex items-center justify-center gap-1">
                          {editandoId === linea.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => setEditandoId(null)}
                              >
                                Guardar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditandoId(null)}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditandoId(linea.id!)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const duplicada = {
                                    ...linea,
                                    descripcion: `${linea.descripcion} (Copia)`
                                  }
                                  onAgregarLinea(duplicada)
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onEliminarLinea(linea.id!)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ✅ ELIMINADA: Sección de resumen con cálculos de IVA, subtotales, etc.
          Los totales deben venir de OrdenEntity.toDTO() */}
    </Card>
  )
}
