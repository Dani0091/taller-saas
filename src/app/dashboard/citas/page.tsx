'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, User, Car, X, Loader2, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface Cita {
  id: string
  titulo: string
  descripcion?: string
  fecha_hora: string
  duracion_minutos: number
  estado: string
  tipo_cita: string
  color: string
  cliente_id?: string
  vehiculo_id?: string
  clientes?: { nombre: string; telefono?: string }
  vehiculos?: { matricula: string; marca?: string; modelo?: string }
}

interface Cliente {
  id: string
  nombre: string
  telefono?: string
}

interface Vehiculo {
  id: string
  matricula: string
  marca?: string
  modelo?: string
  cliente_id: string
}

const TIPOS_CITA = [
  { value: 'revision', label: '🔧 Revisión', color: '#3B82F6' },
  { value: 'reparacion', label: '🛠️ Reparación', color: '#EF4444' },
  { value: 'entrega', label: '🚗 Entrega', color: '#10B981' },
  { value: 'presupuesto', label: '📋 Presupuesto', color: '#F59E0B' },
  { value: 'itv', label: '📝 ITV', color: '#8B5CF6' },
  { value: 'otro', label: '📌 Otro', color: '#6B7280' },
]

const ESTADOS_CITA = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmada', label: 'Confirmada', color: 'bg-blue-100 text-blue-800' },
  { value: 'completada', label: 'Completada', color: 'bg-green-100 text-green-800' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-red-100 text-red-800' },
  { value: 'no_presentado', label: 'No presentado', color: 'bg-gray-100 text-gray-800' },
]

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function CitasPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tallerId, setTallerId] = useState<string>('')
  const [citas, setCitas] = useState<Cita[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])

  // Estado del calendario
  const [fechaActual, setFechaActual] = useState(new Date())
  const [vista, setVista] = useState<'mes' | 'semana' | 'dia'>('mes')

  // Estado del modal
  const [mostrarModal, setMostrarModal] = useState(false)
  const [citaEditando, setCitaEditando] = useState<Cita | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Formulario
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    fecha: '',
    hora: '09:00',
    duracion_minutos: 60,
    tipo_cita: 'revision',
    cliente_id: '',
    vehiculo_id: '',
    color: '#3B82F6'
  })

  useEffect(() => {
    inicializar()
  }, [])

  useEffect(() => {
    if (tallerId) {
      cargarCitas()
    }
  }, [tallerId, fechaActual])

  const inicializar = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        toast.error('No autenticado')
        return
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('taller_id')
        .eq('email', session.user.email)
        .single()

      if (!usuario) {
        toast.error('Usuario no encontrado')
        return
      }

      setTallerId(usuario.taller_id)

      // Cargar clientes
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nombre, telefono')
        .eq('taller_id', usuario.taller_id)
        .order('nombre')

      setClientes(clientesData || [])

      // Cargar vehículos
      const { data: vehiculosData } = await supabase
        .from('vehiculos')
        .select('id, matricula, marca, modelo, cliente_id')
        .eq('taller_id', usuario.taller_id)
        .order('matricula')

      setVehiculos(vehiculosData || [])
    } catch (error: any) {
      toast.error('Error al inicializar')
    } finally {
      setLoading(false)
    }
  }

  const cargarCitas = async () => {
    if (!tallerId) return

    try {
      // Calcular rango de fechas según la vista
      const inicio = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1)
      const fin = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0, 23, 59, 59)

      const { data, error } = await supabase
        .from('citas')
        .select(`
          *,
          clientes(nombre, telefono),
          vehiculos(matricula, marca, modelo)
        `)
        .eq('taller_id', tallerId)
        .gte('fecha_hora', inicio.toISOString())
        .lte('fecha_hora', fin.toISOString())
        .order('fecha_hora')

      if (error) throw error
      setCitas(data || [])
    } catch (error: any) {
      console.error('Error cargando citas:', error)
    }
  }

  const abrirModalNuevaCita = (fecha?: Date) => {
    const fechaSeleccionada = fecha || new Date()
    setFormData({
      titulo: '',
      descripcion: '',
      fecha: fechaSeleccionada.toISOString().split('T')[0],
      hora: '09:00',
      duracion_minutos: 60,
      tipo_cita: 'revision',
      cliente_id: '',
      vehiculo_id: '',
      color: '#3B82F6'
    })
    setCitaEditando(null)
    setMostrarModal(true)
  }

  const abrirModalEditarCita = (cita: Cita) => {
    const fechaHora = new Date(cita.fecha_hora)
    setFormData({
      titulo: cita.titulo,
      descripcion: cita.descripcion || '',
      fecha: fechaHora.toISOString().split('T')[0],
      hora: fechaHora.toTimeString().slice(0, 5),
      duracion_minutos: cita.duracion_minutos,
      tipo_cita: cita.tipo_cita,
      cliente_id: cita.cliente_id || '',
      vehiculo_id: cita.vehiculo_id || '',
      color: cita.color
    })
    setCitaEditando(cita)
    setMostrarModal(true)
  }

  const guardarCita = async () => {
    if (!formData.titulo.trim()) {
      toast.error('El título es obligatorio')
      return
    }

    if (!formData.fecha) {
      toast.error('La fecha es obligatoria')
      return
    }

    setGuardando(true)
    try {
      const fechaHora = new Date(`${formData.fecha}T${formData.hora}:00`)

      const citaData = {
        taller_id: tallerId,
        titulo: formData.titulo,
        descripcion: formData.descripcion || null,
        fecha_hora: fechaHora.toISOString(),
        duracion_minutos: formData.duracion_minutos,
        tipo_cita: formData.tipo_cita,
        cliente_id: formData.cliente_id || null,
        vehiculo_id: formData.vehiculo_id || null,
        color: formData.color,
        estado: 'pendiente'
      }

      if (citaEditando) {
        const { error } = await supabase
          .from('citas')
          .update(citaData)
          .eq('id', citaEditando.id)

        if (error) throw error
        toast.success('Cita actualizada')
      } else {
        const { error } = await supabase
          .from('citas')
          .insert([citaData])

        if (error) throw error
        toast.success('Cita creada')
      }

      setMostrarModal(false)
      cargarCitas()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const eliminarCita = async (id: string) => {
    if (!confirm('¿Eliminar esta cita?')) return

    try {
      const { error } = await supabase
        .from('citas')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Cita eliminada')
      cargarCitas()
    } catch (error: any) {
      toast.error('Error al eliminar')
    }
  }

  const cambiarEstadoCita = async (id: string, estado: string) => {
    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado })
        .eq('id', id)

      if (error) throw error
      toast.success('Estado actualizado')
      cargarCitas()
    } catch (error: any) {
      toast.error('Error al actualizar')
    }
  }

  // Navegación del calendario
  const mesAnterior = () => {
    setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1))
  }

  const mesSiguiente = () => {
    setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 1))
  }

  const irAHoy = () => {
    setFechaActual(new Date())
  }

  // Generar días del mes
  const generarDiasMes = () => {
    const año = fechaActual.getFullYear()
    const mes = fechaActual.getMonth()

    const primerDia = new Date(año, mes, 1)
    const ultimoDia = new Date(año, mes + 1, 0)

    const dias: { fecha: Date; esMesActual: boolean }[] = []

    // Días del mes anterior
    const diasAntes = primerDia.getDay()
    for (let i = diasAntes - 1; i >= 0; i--) {
      dias.push({
        fecha: new Date(año, mes, -i),
        esMesActual: false
      })
    }

    // Días del mes actual
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      dias.push({
        fecha: new Date(año, mes, i),
        esMesActual: true
      })
    }

    // Días del mes siguiente para completar la grilla
    const diasDespues = 42 - dias.length
    for (let i = 1; i <= diasDespues; i++) {
      dias.push({
        fecha: new Date(año, mes + 1, i),
        esMesActual: false
      })
    }

    return dias
  }

  // Obtener citas de un día
  const obtenerCitasDia = (fecha: Date) => {
    return citas.filter(cita => {
      const fechaCita = new Date(cita.fecha_hora)
      return fechaCita.toDateString() === fecha.toDateString()
    })
  }

  // Vehículos filtrados por cliente
  const vehiculosFiltrados = formData.cliente_id
    ? vehiculos.filter(v => v.cliente_id === formData.cliente_id)
    : vehiculos

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    )
  }

  const hoy = new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-6 h-6 md:w-8 md:h-8 text-sky-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Citas</h1>
          </div>
          <p className="text-gray-600">Gestiona las citas y avisos del taller</p>
        </div>
        <Button
          onClick={() => abrirModalNuevaCita()}
          className="gap-2 bg-sky-600 hover:bg-sky-700"
        >
          <Plus className="w-4 h-4" />
          Nueva Cita
        </Button>
      </div>

      {/* Controles del calendario */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={mesAnterior}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={irAHoy}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={mesSiguiente}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold ml-2">
              {MESES[fechaActual.getMonth()]} {fechaActual.getFullYear()}
            </h2>
          </div>

          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['mes', 'semana', 'dia'] as const).map(v => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  vista === v
                    ? 'bg-white text-sky-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {v === 'mes' ? 'Mes' : v === 'semana' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Calendario Vista Mes */}
      {vista === 'mes' && (
        <Card className="p-4 overflow-x-auto">
          {/* Cabecera días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2 min-w-[600px]">
            {DIAS_SEMANA.map(dia => (
              <div key={dia} className="text-center text-xs font-semibold text-gray-500 py-2">
                {dia}
              </div>
            ))}
          </div>

          {/* Grilla de días */}
          <div className="grid grid-cols-7 gap-1 min-w-[600px]">
            {generarDiasMes().map((dia, index) => {
              const citasDia = obtenerCitasDia(dia.fecha)
              const esHoy = dia.fecha.toDateString() === hoy.toDateString()

              return (
                <div
                  key={index}
                  onClick={() => abrirModalNuevaCita(dia.fecha)}
                  className={`
                    min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors
                    ${dia.esMesActual ? 'bg-white' : 'bg-gray-50'}
                    ${esHoy ? 'border-sky-500 border-2' : 'border-gray-200'}
                    hover:bg-sky-50
                  `}
                >
                  <div className={`
                    text-sm font-medium mb-1
                    ${esHoy ? 'text-sky-600' : dia.esMesActual ? 'text-gray-900' : 'text-gray-400'}
                  `}>
                    {dia.fecha.getDate()}
                  </div>

                  {/* Citas del día */}
                  <div className="space-y-1">
                    {citasDia.slice(0, 3).map(cita => (
                      <div
                        key={cita.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          abrirModalEditarCita(cita)
                        }}
                        className="text-xs p-1 rounded truncate text-white"
                        style={{ backgroundColor: cita.color }}
                      >
                        {new Date(cita.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} {cita.titulo}
                      </div>
                    ))}
                    {citasDia.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{citasDia.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Vista Día */}
      {vista === 'dia' && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">
            {fechaActual.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
          <div className="space-y-2">
            {obtenerCitasDia(fechaActual).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay citas para este día</p>
            ) : (
              obtenerCitasDia(fechaActual).map(cita => (
                <div
                  key={cita.id}
                  className="flex items-center gap-4 p-4 rounded-lg border-l-4"
                  style={{ borderLeftColor: cita.color }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">
                        {new Date(cita.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-gray-400">({cita.duracion_minutos} min)</span>
                    </div>
                    <h4 className="font-semibold text-gray-900">{cita.titulo}</h4>
                    {cita.clientes && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <User className="w-3 h-3" />
                        {cita.clientes.nombre}
                      </div>
                    )}
                    {cita.vehiculos && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Car className="w-3 h-3" />
                        {cita.vehiculos.matricula} - {cita.vehiculos.marca} {cita.vehiculos.modelo}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={cita.estado}
                      onChange={(e) => cambiarEstadoCita(cita.id, e.target.value)}
                      className="text-xs border rounded px-2 py-1"
                    >
                      {ESTADOS_CITA.map(e => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirModalEditarCita(cita)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => eliminarCita(cita.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Lista de citas del mes (vista compacta) */}
      {vista === 'semana' && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Citas de {MESES[fechaActual.getMonth()]}</h3>
          {citas.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay citas este mes</p>
          ) : (
            <div className="space-y-2">
              {citas.map(cita => {
                const estadoConfig = ESTADOS_CITA.find(e => e.value === cita.estado)
                return (
                  <div
                    key={cita.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => abrirModalEditarCita(cita)}
                  >
                    <div
                      className="w-3 h-12 rounded-full"
                      style={{ backgroundColor: cita.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>
                          {new Date(cita.fecha_hora).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(cita.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="font-medium truncate">{cita.titulo}</h4>
                      {cita.clientes && (
                        <span className="text-sm text-gray-500">{cita.clientes.nombre}</span>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${estadoConfig?.color}`}>
                      {estadoConfig?.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Modal crear/editar cita */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {citaEditando ? 'Editar Cita' : 'Nueva Cita'}
                </h2>
                <button
                  onClick={() => setMostrarModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Título */}
                <div>
                  <Label>Título *</Label>
                  <Input
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Ej: Revisión 20.000km"
                  />
                </div>

                {/* Tipo de cita */}
                <div>
                  <Label>Tipo de cita</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {TIPOS_CITA.map(tipo => (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          tipo_cita: tipo.value,
                          color: tipo.color
                        })}
                        className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                          formData.tipo_cita === tipo.value
                            ? 'border-sky-500 bg-sky-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {tipo.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fecha y Hora */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fecha *</Label>
                    <Input
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Hora</Label>
                    <Input
                      type="time"
                      value={formData.hora}
                      onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    />
                  </div>
                </div>

                {/* Duración */}
                <div>
                  <Label>Duración</Label>
                  <select
                    value={formData.duracion_minutos}
                    onChange={(e) => setFormData({ ...formData, duracion_minutos: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1h 30min</option>
                    <option value={120}>2 horas</option>
                    <option value={180}>3 horas</option>
                    <option value={240}>4 horas</option>
                  </select>
                </div>

                {/* Cliente */}
                <div>
                  <Label>Cliente (opcional)</Label>
                  <select
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({
                      ...formData,
                      cliente_id: e.target.value,
                      vehiculo_id: ''
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Sin cliente</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Vehículo */}
                {formData.cliente_id && (
                  <div>
                    <Label>Vehículo</Label>
                    <select
                      value={formData.vehiculo_id}
                      onChange={(e) => setFormData({ ...formData, vehiculo_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Sin vehículo</option>
                      {vehiculosFiltrados.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.matricula} - {v.marca} {v.modelo}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Descripción */}
                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Notas adicionales..."
                    rows={3}
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setMostrarModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={guardarCita}
                    disabled={guardando}
                    className="flex-1 bg-sky-600 hover:bg-sky-700"
                  >
                    {guardando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      citaEditando ? 'Guardar' : 'Crear Cita'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
