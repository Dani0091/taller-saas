/**
 * @fileoverview Componente TablaTrabajos - Preparación para MAÑANA
 * @description Tabla optimizada para líneas de factura y mano de obra
 */

'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit2, Copy, Clock, Wrench, Package, Zap, DollarSign } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Badge } from '@/components/ui/badge'
import { useOrderCalculations, useLineManagement } from '@/hooks/useOrderCalculations'
import type { LineaOrden, TipoLinea } from '@/types/workshop'

interface TablaTrabajosProps {
  lineas: LineaOrden[]
  onAgregarLinea: (linea: Omit<LineaOrden, 'id'>) => void
  onActualizarLinea: (id: string, updates: Partial<LineaOrden>) => void
  onEliminarLinea: (id: string) => void
  readonly?: boolean
  compact?: boolean
}

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

  const calculos = useOrderCalculations(lineas)

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
    if (!nuevaLinea.descripcion || !nuevaLinea.cantidad || !nuevaLinea.precio_unitario) {
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
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
                    {tipo.icon} {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <Input
                value={nuevaLinea.descripcion || ''}
                onChange={(e) => setNuevaLinea(prev => ({ 
                  ...prev, 
                  descripcion: e.target.value 
                }))}
                placeholder="Descripción del trabajo/pieza"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cantidad</label>
              <NumberInput
                value={nuevaLinea.cantidad || 1}
                onChange={(value) => setNuevaLinea(prev => ({ 
                  ...prev, 
                  cantidad: value ?? 1 
                }))}
                min={0.01}
                step={nuevaLinea.tipo === 'mano_obra' ? 0.25 : 1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Precio/Unidad</label>
              <NumberInput
                value={nuevaLinea.precio_unitario || 0}
                onChange={(value) => setNuevaLinea(prev => ({ 
                  ...prev, 
                  precio_unitario: value ?? 0 
                }))}
                min={0}
                step={0.01}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAgregarLinea}>
                Agregar
              </Button>
              <Button
                variant="outline"
                onClick={() => setMostrarFormulario(false)}
              >
                Cancelar
              </Button>
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
        <div className="overflow-x-auto">
          <table className={`w-full ${compact ? 'text-sm' : ''}`}>
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Tipo</th>
                <th className="text-left py-2">Descripción</th>
                <th className="text-right py-2">Cantidad</th>
                <th className="text-right py-2">Precio/U</th>
                <th className="text-right py-2">Total</th>
                {!readonly && <th className="text-center py-2">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea) => {
                const tipoInfo = getTipoInfo(linea.tipo)
                const total = (linea.cantidad || 0) * (linea.precio_unitario || 0)
                
                return (
                  <tr key={linea.id} className="border-b hover:bg-gray-50">
                    <td className="py-3">
                      <Badge variant="secondary" className="text-xs">
                        {tipoInfo.icon} {tipoInfo.label}
                      </Badge>
                    </td>
                    
                    <td className="py-3">
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
                    
                    <td className="text-right py-3">
                      {editandoId === linea.id ? (
                        <NumberInput
                          value={linea.cantidad}
                          onChange={(value) => onActualizarLinea(linea.id!, {
                            cantidad: value ?? 1
                          })}
                          min={0.01}
                          step={linea.tipo === 'mano_obra' ? 0.25 : 1}
                          className="w-20 text-right"
                        />
                      ) : (
                        <span>{linea.cantidad}</span>
                      )}
                    </td>
                    
                    <td className="text-right py-3">
                      {editandoId === linea.id ? (
                        <NumberInput
                          value={linea.precio_unitario}
                          onChange={(value) => onActualizarLinea(linea.id!, {
                            precio_unitario: value ?? 0
                          })}
                          min={0}
                          step={0.01}
                          className="w-24 text-right"
                        />
                      ) : (
                        <span>€{(linea.precio_unitario || 0).toFixed(2)}</span>
                      )}
                    </td>
                    
                    <td className="text-right py-3 font-medium">
                      €{total.toFixed(2)}
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
      )}

      {/* Resumen de cálculos */}
      {!compact && (
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Mano de Obra:</span>
              <div className="font-medium">€{calculos.subtotales.mano_obra.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-500">Piezas:</span>
              <div className="font-medium">€{calculos.subtotales.piezas.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-500">IVA (21%):</span>
              <div className="font-medium">€{calculos.iva.cantidad.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-500">Total:</span>
              <div className="font-bold text-lg">€{calculos.total.con_iva.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}