'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Save, Loader2, Car, User, Wrench, FileText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { DecimalInput } from '@/components/ui/decimal-input'
import { InputScanner } from '@/components/ui/input-scanner'
import { toast } from 'sonner'
import Link from 'next/link'

interface Vehiculo {
  id: string
  taller_id: string
  matricula: string
  marca: string | null
  modelo: string | null
  año: number | null
  color: string | null
  kilometros: number | null
  tipo_combustible: string | null
  carroceria: string | null
  potencia_cv: number | null
  cilindrada: number | null
  vin: string | null
  bastidor_vin: string | null
  cliente_id: string | null
  notas: string | null
}

interface Cliente {
  id: string
  nombre: string
  apellidos?: string
}

interface OrdenResumen {
  id: string
  numero_orden: string
  estado: string
  fecha_entrada: string
  descripcion_problema?: string
}

interface DetalleVehiculoSheetProps {
  vehiculoId: string
  onClose: () => void
  onActualizar: () => void
}

export function DetalleVehiculoSheet({
  vehiculoId,
  onClose,
  onActualizar
}: DetalleVehiculoSheetProps) {
  const supabase = createClient()
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [tab, setTab] = useState<'info' | 'historial'>('info')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [ordenes, setOrdenes] = useState<OrdenResumen[]>([])

  const [formData, setFormData] = useState<Vehiculo>({
    id: '',
    taller_id: '',
    matricula: '',
    marca: null,
    modelo: null,
    año: null,
    color: null,
    kilometros: null,
    tipo_combustible: null,
    carroceria: null,
    potencia_cv: null,
    cilindrada: null,
    vin: null,
    bastidor_vin: null,
    cliente_id: null,
    notas: null,
  })

  useEffect(() => {
    cargarDatos()
  }, [vehiculoId])

  const cargarDatos = async () => {
    try {
      setCargando(true)

      // Cargar vehículo
      const { data: vehiculo, error: vehiculoError } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('id', vehiculoId)
        .single()

      if (vehiculoError || !vehiculo) {
        toast.error('Vehículo no encontrado')
        onClose()
        return
      }

      setFormData(vehiculo)

      // Cargar clientes del taller
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nombre, apellidos')
        .eq('taller_id', vehiculo.taller_id)
        .order('nombre')

      setClientes(clientesData || [])

      // Cargar historial de órdenes
      const { data: ordenesData } = await supabase
        .from('ordenes_reparacion')
        .select('id, numero_orden, estado, fecha_entrada, descripcion_problema')
        .eq('vehiculo_id', vehiculoId)
        .order('fecha_entrada', { ascending: false })
        .limit(10)

      setOrdenes(ordenesData || [])

    } catch (error: any) {
      toast.error('Error cargando datos')
      console.error(error)
    } finally {
      setCargando(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : value
    }))
  }

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : parseInt(value)
    }))
  }

  const handleGuardar = async () => {
    try {
      setGuardando(true)

      const response = await fetch('/api/vehiculos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          cliente_id: formData.cliente_id,
          marca: formData.marca,
          modelo: formData.modelo,
          año: formData.año,
          color: formData.color,
          kilometros: formData.kilometros,
          tipo_combustible: formData.tipo_combustible,
          carroceria: formData.carroceria,
          potencia_cv: formData.potencia_cv,
          cilindrada: formData.cilindrada,
          vin: formData.vin,
          bastidor_vin: formData.bastidor_vin,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar')
      }

      toast.success('Vehículo actualizado')
      onActualizar()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setGuardando(false)
    }
  }

  const ESTADO_COLORES: Record<string, string> = {
    recibido: 'bg-blue-100 text-blue-800',
    diagnostico: 'bg-purple-100 text-purple-800',
    presupuestado: 'bg-yellow-100 text-yellow-800',
    aprobado: 'bg-cyan-100 text-cyan-800',
    en_reparacion: 'bg-amber-100 text-amber-800',
    completado: 'bg-green-100 text-green-800',
    entregado: 'bg-emerald-100 text-emerald-800',
    cancelado: 'bg-red-100 text-red-800',
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5 text-sky-600" />
            <div>
              <h2 className="font-bold text-lg">{formData.matricula}</h2>
              <p className="text-xs text-gray-500">{formData.marca} {formData.modelo}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {cargando ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setTab('info')}
                className={`flex-1 py-3 text-sm font-medium ${
                  tab === 'info'
                    ? 'text-sky-600 border-b-2 border-sky-600'
                    : 'text-gray-500'
                }`}
              >
                Información
              </button>
              <button
                onClick={() => setTab('historial')}
                className={`flex-1 py-3 text-sm font-medium ${
                  tab === 'historial'
                    ? 'text-sky-600 border-b-2 border-sky-600'
                    : 'text-gray-500'
                }`}
              >
                Historial ({ordenes.length})
              </button>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-4 pb-24">
              {tab === 'info' && (
                <>
                  {/* Cliente asociado */}
                  <div>
                    <Label>Cliente</Label>
                    <select
                      name="cliente_id"
                      value={formData.cliente_id || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Sin cliente asignado</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} {c.apellidos || ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Datos básicos */}
                  <Card className="p-4 space-y-3">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      Datos del vehículo
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Marca</Label>
                        <Input
                          name="marca"
                          value={formData.marca || ''}
                          onChange={handleChange}
                          placeholder="BMW"
                        />
                      </div>
                      <div>
                        <Label>Modelo</Label>
                        <Input
                          name="modelo"
                          value={formData.modelo || ''}
                          onChange={handleChange}
                          placeholder="320i"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Año</Label>
                          <DecimalInput
                            value={formData.año ? Number(formData.año) : undefined}
                            onChange={(value) => {
                              if (value != null) {
                                setFormData(prev => ({ ...prev, año: Number(value) }))
                              }
                            }}
                            placeholder="2020"
                            min={1900}
                            max={new Date().getFullYear() + 1}
                          />
                      </div>
                      <div>
                        <Label>Color</Label>
                        <Input
                          name="color"
                          value={formData.color || ''}
                          onChange={handleChange}
                          placeholder="Gris"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Kilómetros</Label>
                        <div className="flex gap-1">
                          <DecimalInput
                            value={formData.kilometros ? Number(formData.kilometros) : undefined}
                            onChange={(value) => {
                              if (value != null) {
                                setFormData(prev => ({ ...prev, kilometros: Number(value) }))
                              }
                            }}
                            placeholder="125000"
                            className="flex-1"
                            min={0}
                          />
                <InputScanner
                  tipo="km"
                  onResult={(val) => {
                    const num = parseInt(val.replace(/\D/g, ''))
                    setFormData(prev => ({ ...prev, kilometros: num > 0 ? num : null }))
                  }}
                />
                        </div>
                      </div>
                      <div>
                        <Label>Combustible</Label>
                        <select
                          name="tipo_combustible"
                          value={formData.tipo_combustible || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="gasolina">Gasolina</option>
                          <option value="diésel">Diésel</option>
                          <option value="híbrido">Híbrido</option>
                          <option value="eléctrico">Eléctrico</option>
                          <option value="GLP">GLP</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label>Carrocería</Label>
                      <select
                        name="carroceria"
                        value={formData.carroceria || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Berlina">Berlina</option>
                        <option value="SUV">SUV</option>
                        <option value="Monovolumen">Monovolumen</option>
                        <option value="Deportivo">Deportivo</option>
                        <option value="Coupé">Coupé</option>
                        <option value="Descapotable">Descapotable</option>
                        <option value="Camioneta">Camioneta</option>
                        <option value="Furgoneta">Furgoneta</option>
                      </select>
                    </div>
                  </Card>

                  {/* Datos técnicos */}
                  <Card className="p-4 space-y-3">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      Datos técnicos
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Potencia (CV)</Label>
                        <DecimalInput
                          value={formData.potencia_cv ? Number(formData.potencia_cv) : undefined}
                          onChange={(value) => {
                            if (value != null) {
                              setFormData(prev => ({ ...prev, potencia_cv: Number(value) }))
                            }
                          }}
                          placeholder="120"
                          min={0}
                          step={0.1}
                        />
                      </div>
                      <div>
                        <Label>Cilindrada (cc)</Label>
                        <DecimalInput
                          value={formData.cilindrada ? Number(formData.cilindrada) : undefined}
                          onChange={(value) => {
                            if (value != null) {
                              setFormData(prev => ({ ...prev, cilindrada: Number(value) }))
                            }
                          }}
                          placeholder="1998"
                          min={0}
                        />
                      </div>

                    </div>

                    <div>
                      <Label>VIN / Bastidor</Label>
                      <div className="flex gap-1">
                        <Input
                          name="vin"
                          value={formData.vin || ''}
                          onChange={handleChange}
                          placeholder="WVWZZZ3CZWE123456"
                          maxLength={17}
                          className="flex-1 font-mono text-xs"
                        />
                        <InputScanner
                          tipo="vin"
                          onResult={(val) => {
                            setFormData(prev => ({ ...prev, vin: val }))
                          }}
                        />
                      </div>
                    </div>
                  </Card>
                </>
              )}

              {tab === 'historial' && (
                <div className="space-y-3">
                  {ordenes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Sin órdenes de reparación</p>
                    </div>
                  ) : (
                    ordenes.map(orden => (
                      <Link
                        key={orden.id}
                        href={`/dashboard/ordenes?id=${orden.id}`}
                      >
                        <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">{orden.numero_orden}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORES[orden.estado] || 'bg-gray-100'}`}>
                              {orden.estado}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {orden.descripcion_problema || 'Sin descripción'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(orden.fecha_entrada).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer con botones */}
            {tab === 'info' && (
              <div className="fixed bottom-0 right-0 w-full sm:w-[500px] bg-white border-t p-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-sky-600 hover:bg-sky-700"
                  onClick={handleGuardar}
                  disabled={guardando}
                >
                  {guardando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
