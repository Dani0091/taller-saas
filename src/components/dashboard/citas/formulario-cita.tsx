'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { X, Save, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Cita, TipoCita, EstadoCita } from '@/types/citas'
import { TIPOS_CITA, COLORES_CITA, ESTADOS_CITA } from '@/types/citas'

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

export function FormularioCita({ cita, fechaInicial, onClose, onSave }: FormularioCitaProps) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])

  const [formData, setFormData] = useState({
    titulo: cita?.titulo || '',
    descripcion: cita?.descripcion || '',
    tipo: (cita?.tipo || 'cita') as TipoCita,
    cliente_id: cita?.cliente_id || '',
    vehiculo_id: cita?.vehiculo_id || '',
    fecha_inicio: cita?.fecha_inicio
      ? format(new Date(cita.fecha_inicio), "yyyy-MM-dd'T'HH:mm")
      : fechaInicial
        ? format(fechaInicial, "yyyy-MM-dd'T'09:00")
        : format(new Date(), "yyyy-MM-dd'T'09:00"),
    fecha_fin: cita?.fecha_fin
      ? format(new Date(cita.fecha_fin), "yyyy-MM-dd'T'HH:mm")
      : '',
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
      const [clientesRes, vehiculosRes] = await Promise.all([
        fetch('/api/clientes'),
        fetch('/api/vehiculos')
      ])

      const clientesData = await clientesRes.json()
      const vehiculosData = await vehiculosRes.json()

      if (clientesData.clientes) setClientes(clientesData.clientes)
      if (vehiculosData.vehiculos) setVehiculos(vehiculosData.vehiculos)
    } catch (error) {
      console.error('Error cargando datos:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.titulo.trim()) {
      toast.error('El título es obligatorio')
      return
    }

    try {
      setLoading(true)

      const body = {
        ...formData,
        cliente_id: formData.cliente_id || null,
        vehiculo_id: formData.vehiculo_id || null,
        fecha_fin: formData.fecha_fin || null,
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

      toast.success(cita ? '✅ Cita actualizada' : '✅ Cita creada')
      onSave()
    } catch (error: any) {
      toast.error(error.message || 'Error guardando cita')
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            {cita ? 'Editar Cita' : 'Nueva Cita'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
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
              placeholder="Ej: Revisión de frenos"
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
              <div className="flex gap-1 mt-1">
                {COLORES_CITA.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    className={`w-8 h-8 rounded-full ${c.clase} ${formData.color === c.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    title={c.label}
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
                onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="fecha_fin">Hasta (opcional)</Label>
              <Input
                id="fecha_fin"
                type="datetime-local"
                value={formData.fecha_fin}
                onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })}
              />
            </div>
          </div>

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
                  {c.nombre} {c.apellidos || ''} {c.telefono ? `(${c.telefono})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Vehículo */}
          <div>
            <Label htmlFor="vehiculo_id">Vehículo (opcional)</Label>
            <select
              id="vehiculo_id"
              value={formData.vehiculo_id}
              onChange={e => setFormData({ ...formData, vehiculo_id: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-gray-200"
            >
              <option value="">-- Sin vehículo --</option>
              {vehiculosFiltrados.map(v => (
                <option key={v.id} value={v.id}>
                  {v.matricula} - {v.marca} {v.modelo}
                </option>
              ))}
            </select>
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
              placeholder="Detalles adicionales..."
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
              placeholder="Notas para el equipo..."
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-gray-200 resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-4 border-t">
            {cita && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleEliminar}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            )}
            <div className="flex-1" />
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
