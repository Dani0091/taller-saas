'use client'

/**
 * Selector de Vehículo por Matrícula (autocompletado)
 * Mismo patrón que la búsqueda de matrícula en Factura Rápida
 * (src/app/dashboard/facturas/rapida/page.tsx), extraído para reutilizar
 * en cualquier formulario de factura.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Car, Loader2, Search, Plus, Check, X } from 'lucide-react'
import { NuevoVehiculoModal } from './NuevoVehiculoModal'

export interface VehiculoSeleccionado {
  id: string
  matricula: string
  marca?: string
  modelo?: string
}

interface VehiculoSelectorProps {
  value: VehiculoSeleccionado | null
  onChange: (vehiculo: VehiculoSeleccionado | null) => void
  /** Si se indica, prioriza vehículos ya vinculados a este cliente */
  clienteId?: string
  label?: string
}

export function VehiculoSelector({ value, onChange, clienteId, label = 'Vehículo' }: VehiculoSelectorProps) {
  const [matriculaInput, setMatriculaInput] = useState(value?.matricula || '')
  const [sugerencias, setSugerencias] = useState<VehiculoSeleccionado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mantener el input sincronizado si el vehículo seleccionado cambia desde fuera
  useEffect(() => {
    setMatriculaInput(value?.matricula || '')
  }, [value?.id])

  const buscar = useCallback((valor: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (valor.length < 2) { setSugerencias([]); return }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const params = new URLSearchParams({ matricula: valor })
        if (clienteId) params.set('cliente_id', clienteId)
        const res = await fetch(`/api/vehiculos?${params.toString()}`)
        const data = await res.json()
        setSugerencias(Array.isArray(data) ? data.slice(0, 5) : [])
      } catch {
        // silencioso — el usuario puede seguir escribiendo manualmente
      } finally {
        setBuscando(false)
      }
    }, 300)
  }, [clienteId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/\s/g, '')
    setMatriculaInput(val)
    if (value) onChange(null)
    buscar(val)
  }

  const seleccionar = (v: VehiculoSeleccionado) => {
    onChange(v)
    setMatriculaInput(v.matricula)
    setSugerencias([])
  }

  const limpiar = () => {
    onChange(null)
    setMatriculaInput('')
    setSugerencias([])
  }

  return (
    <div className="relative">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          value={matriculaInput}
          onChange={handleChange}
          placeholder="1234ABC"
          className="font-mono tracking-widest uppercase pr-8"
          autoComplete="off"
        />
        {buscando && (
          <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-gray-400" />
        )}
        {!buscando && matriculaInput && !value && (
          <Search className="absolute right-2 top-2.5 w-4 h-4 text-gray-300" />
        )}
        {value && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sugerencias */}
      {sugerencias.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
          {sugerencias.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => seleccionar(v)}
              className="w-full text-left px-4 py-2.5 hover:bg-sky-50 border-b border-gray-100 last:border-0 flex items-center gap-3"
            >
              <Car className="w-4 h-4 text-sky-500 flex-shrink-0" />
              <div>
                <p className="font-mono font-bold text-gray-900 text-sm">{v.matricula}</p>
                {(v.marca || v.modelo) && (
                  <p className="text-gray-500 text-xs">{v.marca} {v.modelo}</p>
                )}
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setSugerencias([]); setMostrarModal(true) }}
            className="w-full text-left px-4 py-2.5 text-sky-600 text-sm font-medium hover:bg-sky-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Dar de alta como nuevo vehículo
          </button>
        </div>
      )}

      {/* Vehículo seleccionado */}
      {value && (
        <div className="mt-1 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5">
          <Check className="w-3 h-3" />
          {value.marca || value.modelo
            ? `${value.marca ?? ''} ${value.modelo ?? ''}`.trim()
            : 'Vehículo vinculado'}
        </div>
      )}

      {/* Alta rápida si no hay coincidencias */}
      {matriculaInput.length >= 4 && !value && sugerencias.length === 0 && !buscando && (
        <button
          type="button"
          onClick={() => setMostrarModal(true)}
          className="mt-1 text-xs text-sky-600 underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Dar de alta como nuevo vehículo
        </button>
      )}

      <NuevoVehiculoModal
        open={mostrarModal}
        onClose={() => setMostrarModal(false)}
        matriculaInicial={matriculaInput}
        onCreado={(v) => {
          onChange(v)
          setMatriculaInput(v.matricula)
        }}
      />
    </div>
  )
}
