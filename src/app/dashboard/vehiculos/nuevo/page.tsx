'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import { ArrowLeft, Loader2, Check, Car } from 'lucide-react'
import { toast } from 'sonner'
import { InputScanner } from '@/components/ui/input-scanner'
import { useTaller } from '@/contexts/TallerContext'

import {
  createNumericHandler,
  sanitizeMatricula,
  sanitizeKilometros,
  sanitizeAño
} from '@/lib/utils/converters'
import {
  VehiculoFormulario,
  VehiculoDefaults,
  VehiculoValidationRules,
  vehiculoFormularioToBD,
  TIPOS_COMBUSTIBLE_OPTIONS
} from '@/types/vehiculo'

const MARCAS_COMUNES = [
  'Seat', 'Volkswagen', 'Renault', 'Peugeot', 'Citroën', 'Ford', 'Opel',
  'Toyota', 'BMW', 'Mercedes-Benz', 'Audi', 'Fiat', 'Hyundai', 'Kia',
  'Nissan', 'Skoda', 'Dacia', 'Mazda', 'Honda', 'Volvo',
]

const PASOS = ['Matrícula', 'Bastidor', 'Información básica', 'Detalles', 'Revisar']

const STORAGE_KEY = 'vehiculo_form_wizard'

export default function NuevoVehiculoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { tallerId } = useTaller()
  const [formData, setFormData] = useState<VehiculoFormulario>(VehiculoDefaults)
  const [paso, setPaso] = useState<1 | 2 | 3 | 4 | 5>(1)
  const restauradoRef = useRef(false)

  // Restaurar borrador guardado (si lo hay) al montar
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY)
      if (guardado) {
        const { formData: fd, paso: p } = JSON.parse(guardado)
        if (fd) setFormData(fd)
        if (p) setPaso(p)
        toast.info('Se restauró un borrador guardado')
      }
    } catch {
      // Ignorar borradores corruptos
    } finally {
      restauradoRef.current = true
    }
  }, [])

  // Auto-guardar borrador (debounced), solo tras la restauración inicial
  useEffect(() => {
    if (!restauradoRef.current) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, paso }))
      } catch {
        // localStorage lleno o no disponible — no es crítico, seguimos sin persistencia
      }
    }, 500)
    return () => clearTimeout(t)
  }, [formData, paso])

  const set = (patch: Partial<VehiculoFormulario>) =>
    setFormData(prev => ({ ...prev, ...patch }))

  const handleSubmit = async () => {
    if (!tallerId) {
      toast.error('No se encontró taller_id')
      return
    }
    if (!formData.matricula) {
      toast.error('La matrícula es obligatoria')
      setPaso(1)
      return
    }

    setLoading(true)
    try {
      const vehiculoParaBD = vehiculoFormularioToBD(formData)

      const response = await fetch('/api/vehiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vehiculoParaBD, taller_id: tallerId }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Error al crear vehículo')
        setLoading(false)
        return
      }

      toast.success('Vehículo creado correctamente')
      localStorage.removeItem(STORAGE_KEY)
      router.back()
    } catch (error) {
      console.error(error)
      toast.error('Error al crear vehículo')
    } finally {
      setLoading(false)
    }
  }

  const puedeAvanzar =
    (paso === 1 && !!formData.matricula.trim()) ||
    (paso === 2 && !!formData.vin?.trim()) ||
    (paso === 3 && !!formData.marca?.trim() && !!formData.modelo?.trim()) ||
    paso === 4

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nuevo Vehículo</h1>
            <p className="text-gray-500 text-sm">Añade un vehículo al sistema</p>
          </div>
        </div>

        {/* Progreso: círculos + línea, mismo patrón que el wizard de órdenes */}
        <div className="bg-white border rounded-2xl px-4 py-4 mb-4 shadow-sm">
          <div className="flex items-center mb-3">
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    s < paso ? 'bg-green-600 text-white' : s === paso ? 'bg-sky-600 text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {s < paso ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 5 && (
                  <div className="flex-1 h-1 mx-1 rounded-full bg-gray-200 overflow-hidden">
                    <div className={`h-full bg-sky-600 transition-all duration-300 ${s < paso ? 'w-full' : 'w-0'}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-lg font-bold text-gray-900">Paso {paso} de 5</p>
          <p className="text-sm text-gray-500">{PASOS[paso - 1]}</p>
        </div>

        <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-4">
          {paso === 1 && (
            <div>
              <Label className="text-sm font-semibold mb-2 block">Matrícula *</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.matricula}
                  onChange={(e) => set({ matricula: sanitizeMatricula(e.target.value) })}
                  placeholder="Ej: 1234ABC"
                  className="font-mono uppercase text-center text-lg tracking-widest flex-1"
                  autoFocus
                />
                <InputScanner tipo="matricula" onResult={(val) => set({ matricula: sanitizeMatricula(val) })} />
              </div>
              <p className="text-xs text-gray-400 mt-2">Formato español, ej: 1234ABC</p>
            </div>
          )}

          {paso === 2 && (
            <div>
              <Label className="text-sm font-semibold mb-2 block">Bastidor (VIN) *</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.vin || ''}
                  onChange={(e) => set({ vin: e.target.value.toUpperCase() })}
                  placeholder="Ej: WVWZZZ1KZBW123456"
                  className="font-mono uppercase flex-1"
                  autoFocus
                />
                <InputScanner tipo="vin" onResult={(val) => set({ vin: val })} />
              </div>
              <p className="text-xs text-gray-400 mt-2">17 caracteres, en la ficha técnica o el propio bastidor</p>
            </div>
          )}

          {paso === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Marca *</Label>
                <Input
                  list="marcas-comunes"
                  value={formData.marca || ''}
                  onChange={(e) => set({ marca: e.target.value })}
                  placeholder="Ej: Seat"
                  autoFocus
                />
                <datalist id="marcas-comunes">
                  {MARCAS_COMUNES.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>
              <div>
                <Label className="text-sm font-semibold mb-2 block">Modelo *</Label>
                <Input
                  value={formData.modelo || ''}
                  onChange={(e) => set({ modelo: e.target.value })}
                  placeholder="Ej: Ibiza"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold mb-2 block">Año <span className="text-gray-400 font-normal">(opcional)</span></Label>
                <NumberInput
                  value={formData.año}
                  onChange={(value) => {
                    const anioMax = new Date().getFullYear() + 1
                    const añoValidado = sanitizeAño(value, anioMax)
                    if (añoValidado !== undefined) {
                      set({ año: añoValidado })
                    } else if (value != null) {
                      toast.error(VehiculoValidationRules.año.message)
                    }
                  }}
                  placeholder="2022"
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  allowEmpty
                />
              </div>
            </div>
          )}

          {paso === 4 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Combustible</Label>
                <select
                  value={formData.tipo_combustible || ''}
                  onChange={(e) => set({ tipo_combustible: e.target.value })}
                  className="w-full px-3 py-3 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS_COMBUSTIBLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-semibold mb-2 block">Color</Label>
                <Input value={formData.color || ''} onChange={(e) => set({ color: e.target.value })} placeholder="Gris, Blanco, Negro" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Kilómetros</Label>
                  <div className="flex gap-2">
                    <NumberInput
                      value={formData.kilometros}
                      onChange={createNumericHandler(setFormData, 'kilometros', undefined)}
                      placeholder="45000"
                      min={0}
                      allowEmpty
                    />
                    <InputScanner tipo="km" onResult={(val) => {
                      const km = sanitizeKilometros(val)
                      set({ kilometros: km > 0 ? km : formData.kilometros })
                    }} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Potencia (CV)</Label>
                  <NumberInput
                    value={formData.potencia_cv}
                    onChange={createNumericHandler(setFormData, 'potencia_cv', undefined)}
                    placeholder="120"
                    min={0}
                    allowEmpty
                  />
                </div>
              </div>
            </div>
          )}

          {paso === 5 && (
            <div className="divide-y divide-gray-100">
              <div className="pb-3">
                <h3 className="text-xs font-semibold text-gray-500 mb-1">🚗 Vehículo</h3>
                <p className="text-sm text-gray-900 font-mono">{formData.matricula}</p>
                <p className="text-sm text-gray-700">{formData.marca} {formData.modelo}{formData.año ? ` (${formData.año})` : ''}</p>
              </div>
              <div className="py-3">
                <h3 className="text-xs font-semibold text-gray-500 mb-1">Bastidor</h3>
                <p className="text-sm text-gray-900 font-mono">{formData.vin || '—'}</p>
              </div>
              <div className="pt-3">
                <h3 className="text-xs font-semibold text-gray-500 mb-1">Detalles</h3>
                <p className="text-sm text-gray-700">
                  {[formData.color, formData.tipo_combustible, formData.kilometros ? `${formData.kilometros.toLocaleString()} km` : null, formData.potencia_cv ? `${formData.potencia_cv} CV` : null]
                    .filter(Boolean).join(' · ') || 'Sin detalles adicionales'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          {paso > 1 && (
            <Button variant="outline" size="xl" className="flex-1" onClick={() => setPaso(prev => (prev - 1) as any)}>
              Atrás
            </Button>
          )}
          {paso < 5 ? (
            <Button
              size="xl"
              className="flex-1 bg-sky-600 hover:bg-sky-700"
              disabled={!puedeAvanzar}
              onClick={() => setPaso(prev => (prev + 1) as any)}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              size="xl"
              className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creando...
                </>
              ) : (
                <>
                  <Car className="w-5 h-5" /> Crear Vehículo
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
