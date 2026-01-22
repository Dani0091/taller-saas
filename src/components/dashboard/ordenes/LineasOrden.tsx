/**
 * @fileoverview Component "Dumb" - Líneas de Orden
 * @description Maneja la visualización y edición de líneas de manera independiente
 */

'use client'

import { useState } from 'react'
import { NumberInput } from '@/components/ui/number-input'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Trash2, Plus } from 'lucide-react'
import type { LineaOrden, TipoLinea } from '@/types/workshop'

interface LineasOrdenProps {
  lineas: LineaOrden[]
  puedeEditar: boolean
  onAgregar: (linea: Partial<LineaOrden>) => Promise<void>
  onEliminar: (id: string) => Promise<void>
  onActualizar: (id: string, updates: Partial<LineaOrden>) => Promise<void>
}

export function LineasOrden({ lineas, puedeEditar, onAgregar, onEliminar, onActualizar }: LineasOrdenProps) {
  const [agregando, setAgregando] = useState(false)
  const [nuevaLinea, setNuevaLinea] = useState<Partial<LineaOrden>>({
    tipo: 'mano_obra',
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0,
    estado: 'presupuestado'
  })

  const tiposLinea: { value: TipoLinea; label: string }[] = [
    { value: 'mano_obra', label: 'Mano de Obra' },
    { value: 'pieza', label: 'Pieza' },
    { value: 'servicio', label: 'Servicio' },
    { value: 'suplido', label: 'Suplido' },
    { value: 'reembolso', label: 'Reembolso' }
  ]

  const handleAgregarLinea = async () => {
    if (!nuevaLinea.descripcion || !nuevaLinea.cantidad || !nuevaLinea.precio_unitario) {
      return
    }

    setAgregando(true)
    try {
      await onAgregar(nuevaLinea)
      setNuevaLinea({
        tipo: 'mano_obra',
        descripcion: '',
        cantidad: 1,
        precio_unitario: 0,
        estado: 'presupuestado'
      })
    } catch (error) {
      console.error('Error al agregar línea:', error)
    } finally {
      setAgregando(false)
    }
  }

  const handleActualizarLinea = async (id: string, campo: keyof LineaOrden, valor: any) => {
    try {
      await onActualizar(id, { [campo]: valor })
    } catch (error) {
      console.error('Error al actualizar línea:', error)
    }
  }

  const getTipoLabel = (tipo: TipoLinea) => {
    const tipoEncontrado = tiposLinea.find(t => t.value === tipo)
    return tipoEncontrado?.label || tipo
  }

  const getTipoIcon = (tipo: TipoLinea) => {
    switch (tipo) {
      case 'mano_obra': return '🔧'
      case 'pieza': return '🔩'
      case 'servicio': return '⚡'
      case 'suplido': return '📦'
      case 'reembolso': return '💰'
      default: return '📋'
    }
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-4">Elementos de Facturación</h3>
      
      {/* Líneas existentes */}
      <div className="space-y-2 mb-4">
        {lineas.map((linea) => (
          <div key={linea.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <span className="text-sm font-medium">
              {getTipoIcon(linea.tipo)} {getTipoLabel(linea.tipo)}
            </span>
            
            <Input
              value={linea.descripcion}
              onChange={(e) => handleActualizarLinea(linea.id!, 'descripcion', e.target.value)}
              placeholder="Descripción"
              className="flex-1 text-sm"
              disabled={!puedeEditar}
            />
            
            <NumberInput
              value={linea.cantidad}
              onChange={(value) => handleActualizarLinea(linea.id!, 'cantidad', value ?? 1)}
              placeholder="Cant"
              className="w-16 text-sm"
              min={0.01}
              step={linea.tipo === 'mano_obra' ? 0.25 : 1}
              disabled={!puedeEditar}
            />
            
            <NumberInput
              value={linea.precio_unitario}
              onChange={(value) => handleActualizarLinea(linea.id!, 'precio_unitario', value ?? 0)}
              placeholder="€/ud"
              className="w-20 text-sm"
              min={0}
              step={0.01}
              disabled={!puedeEditar}
            />
            
            <span className="text-sm font-medium text-gray-600 min-w-[60px] text-right">
              €{((linea.cantidad || 0) * (linea.precio_unitario || 0)).toFixed(2)}
            </span>
            
            {puedeEditar && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onEliminar(linea.id!)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Formulario para nueva línea */}
      {puedeEditar && (
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
            <select
              value={nuevaLinea.tipo}
              onChange={(e) => setNuevaLinea(prev => ({ ...prev, tipo: e.target.value as TipoLinea }))}
              className="text-sm border rounded px-2 py-1"
            >
              {tiposLinea.map(tipo => (
                <option key={tipo.value} value={tipo.value}>
                  {getTipoIcon(tipo.value)} {tipo.label}
                </option>
              ))}
            </select>
            
            <Input
              value={nuevaLinea.descripcion || ''}
              onChange={(e) => setNuevaLinea(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Descripción"
              className="flex-1 text-sm"
            />
            
            <NumberInput
              value={nuevaLinea.cantidad}
              onChange={(value) => setNuevaLinea(prev => ({ ...prev, cantidad: value ?? 1 }))}
              placeholder="Cant"
              className="w-16 text-sm"
              min={0.01}
              step={nuevaLinea.tipo === 'mano_obra' ? 0.25 : 1}
            />
            
            <NumberInput
              value={nuevaLinea.precio_unitario}
              onChange={(value) => setNuevaLinea(prev => ({ ...prev, precio_unitario: value ?? 0 }))}
              placeholder="€/ud"
              className="w-20 text-sm"
              min={0}
              step={0.01}
            />
            
            <Button
              size="sm"
              onClick={handleAgregarLinea}
              disabled={agregando || !nuevaLinea.descripcion}
              className="h-8 px-3"
            >
              <Plus className="h-3 w-3 mr-1" />
              Agregar
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}