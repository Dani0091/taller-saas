'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { X, Save, Trash2, Loader2, Plus, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Cita, TipoCita, EstadoCita } from '@/types/citas'
import { TIPOS_CITA, COLORES_CITA, ESTADOS_CITA } from '@/types/citas'
import { WhatsAppCita } from './whatsapp-cita'
import { ExportarCalendario } from './exportar-calendario'
import { horaLocalAInstante, instanteAHoraLocal } from '@/lib/citas/fecha-hora'
import { finAnteriorAInicio, ERROR_FIN_ANTERIOR } from '@/lib/citas/fecha-fin'

const NUEVO_VEHICULO = '__nuevo__'

/** Mueve el fin con el inicio conservando la duración, si el fin quedaría antes. */
function finTrasCambiarInicio(inicioAnterior: string, inicioNuevo: string, fin: string): string {
  if (!fin || !finAnteriorAInicio(inicioNuevo, fin)) return fin
  const duracion = new Date(fin).getTime() - new Date(inicioAnterior).getTime()
  const nuevoFin = new Date(new Date(inicioNuevo).getTime() + (duracion > 0 ? duracion : 60 * 60 * 1000))
  return format(nuevoFin, "yyyy-MM-dd'T'HH:mm")
}

interface FormularioCitaProps {
  cita?: Cita | null
  fechaInicial?: Date | null
  onClose: () => void
  onSave: () => void
}

interface Cliente {
  id: string
  nombre: string
  apellidos?: string
  telefono?: string
}

interface Vehiculo {
  id: string
  matricula: string
  marca?: string
  modelo?: string
  cliente_id?: string
}

/** Normaliza una respuesta de API que puede ser un array o { [clave]: array }. */
function comoLista<T>(datos: unknown, clave: string): T[] {
  if (Array.isArray(datos)) return datos as T[]
  const anidado = (datos as Record<string, unknown> | null)?.[clave]
  return Array.isArray(anidado) ? (anidado as T[]) : []
}

export function FormularioCita({ cita, fechaInicial, onClose, onSave }: FormularioCitaProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [creandoOrden, setCreandoOrden] = useState(false)
  const [nuevoVehiculo, setNuevoVehiculo] = useState<{ matricula: string; marca: string; modelo: string } | null>(null)
  const [guardandoVehiculo, setGuardandoVehiculo] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [taller, setTaller] = useState<{ nombre?: string; direccion?: string }>({})

  const [formData, setFormData] = useState({
    titulo: cita?.titulo || '',
    descripcion: cita?.descripcion || '',
    tipo: (cita?.tipo || 'cita') as TipoCita,
    cliente_id: cita?.cliente_id || '',
    vehiculo_id: cita?.vehiculo_id || '',
    fecha_inicio: cita?.fecha_inicio
      ? instanteAHoraLocal(cita.fecha_inicio)
      : fechaInicial
        ? format(fechaInicial, "yyyy-MM-dd'T'09:00")
        : format(new Date(), "yyyy-MM-dd'T'09:00"),
    fecha_fin: instanteAHoraLocal(cita?.fecha_fin),
    todo_el_dia: cita?.todo_el_dia || false,
    estado: (cita?.estado || 'pendiente') as EstadoCita,
    recordatorio_email: cita?.recordatorio_email || false,
    recordatorio_sms: cita?.recordatorio_sms || false,
    minutos_antes_recordatorio: cita?.minutos_antes_recordatorio || 60,
    color: cita?.color || '#3b82f6',
    notas: cita?.notas || ''
  })

  // Cargar clientes y vehículos
  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const [clientesRes, vehiculosRes, tallerRes] = await Promise.all([
        fetch('/api/clientes'),
        fetch('/api/vehiculos'),
        // Solo para el mensaje de WhatsApp; si falla, el mensaje sale sin nombre ni dirección.
        fetch('/api/taller/config/obtener').catch(() => null)
      ])

      const clientesData = await clientesRes.json()
      const vehiculosData = await vehiculosRes.json()

      // /api/clientes y /api/vehiculos devuelven un array; se acepta también
      // la forma antigua { clientes } / { vehiculos }.
      setClientes(comoLista<Cliente>(clientesData, 'clientes'))
      setVehiculos(comoLista<Vehiculo>(vehiculosData, 'vehiculos'))
      if (tallerRes?.ok) {
        const cfg = await tallerRes.json()
        setTaller({ nombre: cfg?.nombre_empresa || undefined, direccion: cfg?.direccion || undefined })
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    }
  }

  /** Guarda la cita y devuelve su id (null si hubo error). */
  const guardarCita = async (): Promise<string | null> => {
    if (!formData.titulo.trim()) {
      toast.error('El título es obligatorio')
      return null
    }
    if (finAnteriorAInicio(horaLocalAInstante(formData.fecha_inicio), horaLocalAInstante(formData.fecha_fin))) {
      toast.error(ERROR_FIN_ANTERIOR)
      return null
    }

    try {
      setLoading(true)

      const body = {
        ...formData,
        cliente_id: formData.cliente_id || null,
        vehiculo_id: formData.vehiculo_id || null,
        // Hora local del navegador → instante exacto (evita el desfase con Postgres en UTC)
        fecha_inicio: horaLocalAInstante(formData.fecha_inicio),
        fecha_fin: horaLocalAInstante(formData.fecha_fin),
        notas: formData.notas || null
      }

      const url = cita ? `/api/citas/${cita.id}` : '/api/citas'
      const method = cita ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      return (data.cita?.id ?? data.id ?? cita?.id ?? null) as string | null
    } catch (error: any) {
      toast.error(error.message || 'Error guardando cita')
      return null
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = await guardarCita()
    if (!id) return
    toast.success(cita ? '✅ Cita actualizada' : '✅ Cita creada')
    onSave()
  }

  /** Guarda la cita (con lo que haya en pantalla) y crea o abre su orden. */
  const handleCrearOrden = async () => {
    const id = await guardarCita()
    if (!id) return
    try {
      setCreandoOrden(true)
      const res = await fetch(`/api/citas/${id}/orden`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.creada ? `Orden ${data.orden.numero_orden} creada` : `Abriendo orden ${data.orden.numero_orden}`)
      onSave()
      router.push(`/dashboard/ordenes?orden=${data.orden.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Error creando la orden')
    } finally {
      setCreandoOrden(false)
    }
  }

  const handleGuardarVehiculo = async () => {
    if (!nuevoVehiculo?.matricula.trim()) {
      toast.error('La matrícula es obligatoria')
      return
    }
    try {
      setGuardandoVehiculo(true)
      const res = await fetch('/api/vehiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula: nuevoVehiculo.matricula,
          marca: nuevoVehiculo.marca || null,
          modelo: nuevoVehiculo.modelo || null,
          cliente_id: formData.cliente_id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const creado: Vehiculo = data.vehiculo ?? data
      setVehiculos(prev => [...prev, creado])
      setFormData(prev => ({ ...prev, vehiculo_id: creado.id }))
      setNuevoVehiculo(null)
      toast.success(`Vehículo ${creado.matricula} añadido`)
    } catch (error: any) {
      toast.error(error.message || 'Error añadiendo el vehículo')
    } finally {
      setGuardandoVehiculo(false)
    }
  }

  const handleVehiculoChange = (valor: string) => {
    if (valor === NUEVO_VEHICULO) {
      setNuevoVehiculo({ matricula: '', marca: '', modelo: '' })
      return
    }
    setNuevoVehiculo(null)
    // Elegir primero el vehículo rellena su cliente
    const v = vehiculos.find(x => x.id === valor)
    setFormData(prev => ({
      ...prev,
      vehiculo_id: valor,
      cliente_id: prev.cliente_id || v?.cliente_id || '',
    }))
  }

  const handleEliminar = async () => {
    if (!cita) return
    if (!confirm('¿Eliminar esta cita?')) return

    try {
      setDeleting(true)

      const res = await fetch(`/api/citas/${cita.id}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      toast.success('Cita eliminada')
      onSave()
    } catch (error: any) {
      toast.error(error.message || 'Error eliminando cita')
    } finally {
      setDeleting(false)
    }
  }

  // Filtrar vehículos por cliente seleccionado
  const vehiculosFiltrados = formData.cliente_id
    ? vehiculos.filter(v => v.cliente_id === formData.cliente_id)
    : vehiculos

  const clienteSeleccionado = clientes.find(c => c.id === formData.cliente_id)
  const vehiculoSeleccionado = vehiculos.find(v => v.id === formData.vehiculo_id)
  const inicioCompartible = horaLocalAInstante(formData.fecha_inicio)
  const citaCompartible = cita && formData.titulo && inicioCompartible
    ? {
        titulo: formData.titulo,
        fecha_inicio: inicioCompartible,
        fecha_fin: horaLocalAInstante(formData.fecha_fin),
        todo_el_dia: formData.todo_el_dia,
        descripcion: formData.descripcion || null
      }
    : null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            {cita ? 'Editar Cita' : 'Nueva Cita'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Título */}
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={e => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej.: Revisión de frenos"
              required
            />
          </div>

          {/* Tipo y Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                value={formData.tipo}
                onChange={e => setFormData({ ...formData, tipo: e.target.value as TipoCita })}
                className="w-full h-10 px-3 rounded-md border border-gray-200"
              >
                {TIPOS_CITA.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <div className="flex flex-wrap gap-2 mt-1" role="group" aria-label="Color de la cita">
                {COLORES_CITA.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    className={`w-7 h-7 rounded-full ${c.clase} ${formData.color === c.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    title={c.label}
                    aria-label={`Color ${c.label}`}
                    aria-pressed={formData.color === c.value}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fecha_inicio">Fecha y Hora *</Label>
              <Input
                id="fecha_inicio"
                type="datetime-local"
                value={formData.fecha_inicio}
                onChange={e => {
                  const inicio = e.target.value
                  setFormData(prev => ({ ...prev, fecha_inicio: inicio, fecha_fin: finTrasCambiarInicio(prev.fecha_inicio, inicio, prev.fecha_fin) }))
                }}
                required
              />
            </div>
            <div>
              <Label htmlFor="fecha_fin">Hasta (opcional)</Label>
              <Input
                id="fecha_fin"
                type="datetime-local"
                value={formData.fecha_fin}
                min={formData.fecha_inicio}
                onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })}
                aria-invalid={finAnteriorAInicio(horaLocalAInstante(formData.fecha_inicio), horaLocalAInstante(formData.fecha_fin))}
                aria-describedby="fecha_fin_error"
              />
            </div>
          </div>

          {finAnteriorAInicio(horaLocalAInstante(formData.fecha_inicio), horaLocalAInstante(formData.fecha_fin)) && (
            <p id="fecha_fin_error" role="alert" className="-mt-2 text-sm text-red-600">{ERROR_FIN_ANTERIOR}</p>
          )}

          {/* Todo el día */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.todo_el_dia}
              onChange={e => setFormData({ ...formData, todo_el_dia: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Todo el día</span>
          </label>

          {/* Cliente */}
          <div>
            <Label htmlFor="cliente_id">Cliente (opcional)</Label>
            <select
              id="cliente_id"
              value={formData.cliente_id}
              onChange={e => setFormData({ ...formData, cliente_id: e.target.value, vehiculo_id: '' })}
              className="w-full h-10 px-3 rounded-md border border-gray-200"
            >
              <option value="">-- Sin cliente --</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {[c.nombre, c.apellidos, c.telefono && `(${c.telefono})`].filter(Boolean).join(' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Vehículo */}
          <div>
            <Label htmlFor="vehiculo_id">Vehículo (opcional)</Label>
            <select
              id="vehiculo_id"
              value={nuevoVehiculo ? NUEVO_VEHICULO : formData.vehiculo_id}
              onChange={e => handleVehiculoChange(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-200"
              aria-describedby="vehiculo_ayuda"
            >
              <option value="">-- Sin vehículo --</option>
              {vehiculosFiltrados.map(v => (
                <option key={v.id} value={v.id}>
                  {[v.matricula, [v.marca, v.modelo].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
                </option>
              ))}
              <option value={NUEVO_VEHICULO}>+ Añadir vehículo nuevo…</option>
            </select>
            {formData.cliente_id && vehiculosFiltrados.length === 0 && !nuevoVehiculo && (
              <p id="vehiculo_ayuda" className="mt-1 text-sm text-gray-500">
                Este cliente aún no tiene vehículos. Elige «+ Añadir vehículo nuevo…».
              </p>
            )}

            {nuevoVehiculo && (
              <div className="mt-2 space-y-3 rounded-lg border border-sky-200 bg-sky-50 p-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="nuevo_matricula">Matrícula *</Label>
                    <Input
                      id="nuevo_matricula"
                      value={nuevoVehiculo.matricula}
                      onChange={e => setNuevoVehiculo({ ...nuevoVehiculo, matricula: e.target.value.toUpperCase() })}
                      placeholder="1234 BCD"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label htmlFor="nuevo_marca">Marca</Label>
                    <Input
                      id="nuevo_marca"
                      value={nuevoVehiculo.marca}
                      onChange={e => setNuevoVehiculo({ ...nuevoVehiculo, marca: e.target.value })}
                      placeholder="Seat"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nuevo_modelo">Modelo</Label>
                    <Input
                      id="nuevo_modelo"
                      value={nuevoVehiculo.modelo}
                      onChange={e => setNuevoVehiculo({ ...nuevoVehiculo, modelo: e.target.value })}
                      placeholder="León"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  {clienteSeleccionado
                    ? `Se guardará a nombre de ${[clienteSeleccionado.nombre, clienteSeleccionado.apellidos].filter(Boolean).join(' ')}.`
                    : 'Se guardará sin cliente; puedes asignarlo después en Vehículos.'}
                </p>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setNuevoVehiculo(null)}>
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" onClick={handleGuardarVehiculo} disabled={guardandoVehiculo} className="gap-1">
                    {guardandoVehiculo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Añadir vehículo
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Estado (solo al editar) */}
          {cita && (
            <div>
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                value={formData.estado}
                onChange={e => setFormData({ ...formData, estado: e.target.value as EstadoCita })}
                className="w-full h-10 px-3 rounded-md border border-gray-200"
              >
                {ESTADOS_CITA.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Descripción */}
          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Ej.: Ruido al frenar en frío; trae las pastillas compradas"
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-gray-200 resize-none"
            />
          </div>

          {/* Notas internas */}
          <div>
            <Label htmlFor="notas">Notas internas</Label>
            <textarea
              id="notas"
              value={formData.notas}
              onChange={e => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Ej.: Llamar antes de cambiar piezas (solo lo ve el taller)"
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-gray-200 resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {cita && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleEliminar}
                disabled={deleting}
                aria-label="Eliminar cita"
                title="Eliminar cita"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            )}

            {/* Calendario y WhatsApp: solo con la cita ya guardada (lo que se comparte es lo guardado) */}
            {citaCompartible && (
              <ExportarCalendario cita={citaCompartible} ubicacion={taller.direccion} />
            )}

            {citaCompartible && clienteSeleccionado?.telefono && (
              <WhatsAppCita
                telefono={clienteSeleccionado.telefono}
                cita={citaCompartible}
                datos={{
                  nombreTaller: taller.nombre,
                  direccionTaller: taller.direccion,
                  nombreCliente: clienteSeleccionado.nombre,
                  vehiculo: vehiculoSeleccionado
                    ? [vehiculoSeleccionado.marca, vehiculoSeleccionado.modelo, vehiculoSeleccionado.matricula].filter(Boolean).join(' ')
                    : undefined
                }}
              />
            )}

            <div className="flex-1" />
            {cita?.orden_id ? (
              <Button type="button" variant="outline" onClick={() => router.push(`/dashboard/ordenes?orden=${cita.orden_id}`)} className="gap-1">
                <Wrench className="w-4 h-4" />
                Ver orden
              </Button>
            ) : formData.cliente_id && formData.vehiculo_id && !nuevoVehiculo ? (
              <Button type="button" variant="outline" onClick={handleCrearOrden} disabled={loading || creandoOrden} className="gap-1">
                {creandoOrden ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                {cita ? 'Crear orden' : 'Guardar y crear orden'}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
