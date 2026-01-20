'use client'

import { useState } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DecimalInput } from '@/components/ui/decimal-input'
import { toast } from 'sonner'

interface Orden {
  id: string
  horas_estimadas: number | null
  horas_reales: number | null
  costo_estimado: number
  costo_real: number
  descripcion_problema?: string
  diagnostico?: string
  trabajos_realizados?: string
}

interface EditarOrdenSheetProps {
  orden: Orden
  campo: string
  onClose: () => void
  onGuardar: () => void
}

export function EditarOrdenSheet({ orden, campo, onClose, onGuardar }: EditarOrdenSheetProps) {
  const [guardando, setGuardando] = useState(false)
  const [valores, setValores] = useState({
    horas_estimadas: orden.horas_estimadas?.toString() || '',
    horas_reales: orden.horas_reales?.toString() || '',
    costo_estimado: orden.costo_estimado?.toString() || '',
    costo_real: orden.costo_real?.toString() || '',
    descripcion_problema: orden.descripcion_problema || '',
    diagnostico: orden.diagnostico || '',
    trabajos_realizados: orden.trabajos_realizados || ''
  })

  const getConfig = (c: string) => {
    const configs: Record<string, any> = {
      problema: {
        titulo: 'Describir Problema',
        descripcion: 'Describe lo que observa el cliente',
        campos: ['descripcion_problema'],
        boton: 'Guardar Problema'
      },
      diagnostico: {
        titulo: 'Completar Diagnóstico',
        descripcion: 'Basado en la inspección, ¿cuál es el problema real?',
        campos: ['diagnostico'],
        boton: 'Guardar Diagnóstico'
      },
      trabajos: {
        titulo: 'Trabajos Realizados',
        descripcion: 'Describe exactamente qué se hizo',
        campos: ['trabajos_realizados'],
        boton: 'Guardar Trabajos'
      },
      horas: {
        titulo: 'Horas de Trabajo',
        descripcion: 'Actualiza las horas estimadas y reales',
        campos: ['horas_estimadas', 'horas_reales'],
        boton: 'Guardar Horas'
      },
      costos: {
        titulo: 'Costos',
        descripcion: 'Actualiza los costos estimados y reales',
        campos: ['costo_estimado', 'costo_real'],
        boton: 'Guardar Costos'
      }
    }
    return configs[c] || configs.problema
  }

  const config = getConfig(campo)

  const guardarCambios = async () => {
    try {
      setGuardando(true)
      
      const payload: Record<string, any> = {}
      config.campos.forEach((f: string) => {
        if (f.startsWith('horas_') || f.startsWith('costo_')) {
          payload[f] = valores[f as keyof typeof valores] ? parseFloat(valores[f as keyof typeof valores]) : null
        } else {
          payload[f] = valores[f as keyof typeof valores]
        }
      })

      const res = await fetch(`/api/ordenes/${orden.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Error al guardar')

      toast.success('Cambios guardados')
      onGuardar()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-10">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{config.titulo}</h2>
            <p className="text-sm text-gray-600 mt-1">{config.descripcion}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {config.campos.map((field: string) => (
            <div key={field} className="space-y-2">
              <Label>
                {field === 'descripcion_problema' && 'Descripción del Problema'}
                {field === 'diagnostico' && 'Diagnóstico'}
                {field === 'trabajos_realizados' && 'Trabajos Realizados'}
                {field === 'horas_estimadas' && 'Horas Estimadas'}
                {field === 'horas_reales' && 'Horas Reales'}
                {field === 'costo_estimado' && 'Costo Estimado (€)'}
                {field === 'costo_real' && 'Costo Real (€)'}
              </Label>
              {field.includes('_problema') || field === 'diagnostico' || field === 'trabajos_realizados' ? (
                <Textarea
                  value={valores[field as keyof typeof valores]}
                  onChange={(e) => setValores({ ...valores, [field]: e.target.value })}
                  placeholder="Ingresa el contenido..."
                  className="min-h-32"
                />
              ) : (
                <DecimalInput
                  value={valores[field as keyof typeof valores]}
                  onChange={(value) => setValores({ ...valores, [field]: value })}
                  step={field.includes('costo') ? 0.01 : 0.5}
                  min={0}
                  placeholder="0.00"
                  className="py-3"
                />
              )}
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 space-y-2">
          <Button
            onClick={guardarCambios}
            disabled={guardando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6"
          >
            {guardando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {config.boton}
              </>
            )}
          </Button>
          <Button onClick={onClose} variant="outline" disabled={guardando} className="w-full py-3">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
