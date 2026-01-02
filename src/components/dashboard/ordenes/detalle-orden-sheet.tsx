'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Save, Plus, Trash2, Loader2, FileText, ChevronDown, Check, Camera, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

// Estados disponibles para órdenes
const ESTADOS = [
  { value: 'recibido', label: 'Recibido', color: 'bg-blue-500', icon: '📋' },
  { value: 'diagnostico', label: 'En Diagnóstico', color: 'bg-purple-500', icon: '🔍' },
  { value: 'presupuestado', label: 'Presupuestado', color: 'bg-yellow-500', icon: '💰' },
  { value: 'aprobado', label: 'Aprobado', color: 'bg-cyan-500', icon: '✓' },
  { value: 'en_reparacion', label: 'En Reparación', color: 'bg-amber-500', icon: '🔧' },
  { value: 'completado', label: 'Completado', color: 'bg-green-500', icon: '✅' },
  { value: 'entregado', label: 'Entregado', color: 'bg-emerald-600', icon: '🚗' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500', icon: '❌' },
]

// Fracciones de hora disponibles (para mano de obra)
const FRACCIONES_HORA = [
  { value: 0.25, label: '15 min' },
  { value: 0.5, label: '30 min' },
  { value: 0.75, label: '45 min' },
  { value: 1, label: '1 hora' },
  { value: 1.5, label: '1h 30min' },
  { value: 2, label: '2 horas' },
  { value: 2.5, label: '2h 30min' },
  { value: 3, label: '3 horas' },
  { value: 4, label: '4 horas' },
  { value: 5, label: '5 horas' },
  { value: 6, label: '6 horas' },
  { value: 8, label: '8 horas' },
]

// Cantidades disponibles (para piezas/servicios)
const CANTIDADES = [
  { value: 1, label: '1 ud' },
  { value: 2, label: '2 uds' },
  { value: 3, label: '3 uds' },
  { value: 4, label: '4 uds' },
  { value: 5, label: '5 uds' },
  { value: 6, label: '6 uds' },
  { value: 8, label: '8 uds' },
  { value: 10, label: '10 uds' },
  { value: 12, label: '12 uds' },
]

interface Orden {
  id?: string
  numero_orden?: string
  estado: string
  cliente_id: string
  vehiculo_id: string
  descripcion_problema?: string
  diagnostico?: string
  trabajos_realizados?: string
  notas?: string
  presupuesto_aprobado_por_cliente?: boolean
  tiempo_estimado_horas?: number
  tiempo_real_horas?: number
  subtotal_mano_obra?: number
  subtotal_piezas?: number
  iva_amount?: number
  total_con_iva?: number
  fotos_entrada?: string
  fotos_salida?: string
}

interface DetalleOrdenSheetProps {
  ordenSeleccionada?: string | null
  ordenes?: any[]
  onClose: () => void
  onActualizar: () => void
  modoCrear?: boolean
}

interface Linea {
  id: string
  tipo: 'mano_obra' | 'pieza' | 'servicio'
  descripcion: string
  cantidad: number
  precio_unitario: number
  isNew?: boolean
}

export function DetalleOrdenSheet({
  ordenSeleccionada,
  onClose,
  onActualizar,
  modoCrear = false
}: DetalleOrdenSheetProps) {
  const router = useRouter()
  const supabase = createClient()
  const [cargando, setCargando] = useState(!modoCrear)
  const [guardando, setGuardando] = useState(false)
  const [generandoFactura, setGenerandoFactura] = useState(false)
  const [tab, setTab] = useState<'info' | 'fotos' | 'trabajo' | 'items'>('info')
  const [lineas, setLineas] = useState<Linea[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [tallerId, setTallerId] = useState<string>('')
  const [ordenNumero, setOrdenNumero] = useState<string>('')
  const [mostrarEstados, setMostrarEstados] = useState(false)

  const [formData, setFormData] = useState<Orden>({
    estado: 'recibido',
    cliente_id: '',
    vehiculo_id: '',
    descripcion_problema: '',
    diagnostico: '',
    trabajos_realizados: '',
    notas: '',
    presupuesto_aprobado_por_cliente: false,
    tiempo_estimado_horas: 0,
    tiempo_real_horas: 0,
    fotos_entrada: '',
    fotos_salida: '',
  })

  const [nuevaLinea, setNuevaLinea] = useState({
    tipo: 'mano_obra' as const,
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0
  })

  // Cargar datos iniciales
  useEffect(() => {
    inicializar()
  }, [])

  // Cargar vehículos cuando cambia el cliente
  useEffect(() => {
    if (formData.cliente_id && tallerId) {
      cargarVehiculos(formData.cliente_id)
    }
  }, [formData.cliente_id, tallerId])

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
        .select('id, nombre, nif, telefono')
        .eq('taller_id', usuario.taller_id)
        .order('nombre')

      setClientes(clientesData || [])

      // Si estamos editando, cargar orden completa
      if (!modoCrear && ordenSeleccionada) {
        const { data: ordenData, error } = await supabase
          .from('ordenes_reparacion')
          .select('*')
          .eq('id', ordenSeleccionada)
          .single()

        if (error || !ordenData) {
          toast.error('Orden no encontrada')
          onClose()
          return
        }

        setOrdenNumero(ordenData.numero_orden)
        setFormData({
          estado: ordenData.estado || 'recibido',
          cliente_id: ordenData.cliente_id || '',
          vehiculo_id: ordenData.vehiculo_id || '',
          descripcion_problema: ordenData.descripcion_problema || '',
          diagnostico: ordenData.diagnostico || '',
          trabajos_realizados: ordenData.trabajos_realizados || '',
          notas: ordenData.notas || '',
          presupuesto_aprobado_por_cliente: ordenData.presupuesto_aprobado_por_cliente || false,
          tiempo_estimado_horas: ordenData.tiempo_estimado_horas || 0,
          tiempo_real_horas: ordenData.tiempo_real_horas || 0,
          subtotal_mano_obra: ordenData.subtotal_mano_obra || 0,
          subtotal_piezas: ordenData.subtotal_piezas || 0,
          iva_amount: ordenData.iva_amount || 0,
          total_con_iva: ordenData.total_con_iva || 0,
          fotos_entrada: ordenData.fotos_entrada || '',
          fotos_salida: ordenData.fotos_salida || '',
        })

        // Cargar vehículos del cliente
        if (ordenData.cliente_id) {
          cargarVehiculos(ordenData.cliente_id)
        }

        // Cargar líneas de la orden
        const { data: lineasData } = await supabase
          .from('lineas_orden')
          .select('*')
          .eq('orden_id', ordenSeleccionada)
          .order('created_at')

        if (lineasData) {
          setLineas(lineasData.map(l => ({
            id: l.id,
            tipo: l.tipo as any,
            descripcion: l.descripcion,
            cantidad: l.cantidad,
            precio_unitario: l.precio_unitario,
            isNew: false
          })))
        }
      } else {
        // Generar número de orden para nueva
        const { data: ultimaOrden } = await supabase
          .from('ordenes_reparacion')
          .select('numero_orden')
          .eq('taller_id', usuario.taller_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        let siguienteNumero = 1
        if (ultimaOrden?.numero_orden) {
          const match = ultimaOrden.numero_orden.match(/OR-(\d+)/)
          if (match) {
            siguienteNumero = parseInt(match[1]) + 1
          }
        }
        setOrdenNumero(`OR-${siguienteNumero.toString().padStart(4, '0')}`)
      }
    } catch (error: any) {
      console.error('Error inicializando:', error)
      toast.error('Error al cargar datos')
    } finally {
      setCargando(false)
    }
  }

  const cargarVehiculos = async (clienteId: string) => {
    const { data } = await supabase
      .from('vehiculos')
      .select('id, marca, modelo, matricula, km_actual')
      .eq('cliente_id', clienteId)
      .order('matricula')

    setVehiculos(data || [])
  }

  // Calcular totales
  const totales = lineas.reduce(
    (acc, linea) => {
      const subtotal = linea.cantidad * linea.precio_unitario
      const iva = subtotal * 0.21
      return {
        manoObra: linea.tipo === 'mano_obra' ? acc.manoObra + subtotal : acc.manoObra,
        piezas: linea.tipo === 'pieza' ? acc.piezas + subtotal : acc.piezas,
        servicios: linea.tipo === 'servicio' ? acc.servicios + subtotal : acc.servicios,
        subtotal: acc.subtotal + subtotal,
        iva: acc.iva + iva,
        total: acc.total + subtotal + iva
      }
    },
    { manoObra: 0, piezas: 0, servicios: 0, subtotal: 0, iva: 0, total: 0 }
  )

  const agregarLinea = () => {
    if (!nuevaLinea.descripcion) {
      toast.error('Añade una descripción')
      return
    }
    if (nuevaLinea.precio_unitario <= 0) {
      toast.error('Añade un precio válido')
      return
    }

    setLineas([...lineas, {
      id: `new-${Date.now()}`,
      ...nuevaLinea,
      isNew: true
    }])
    setNuevaLinea({ tipo: 'mano_obra', descripcion: '', cantidad: 1, precio_unitario: 0 })
    toast.success('Línea añadida')
  }

  const eliminarLinea = async (id: string) => {
    if (!id.startsWith('new-')) {
      await supabase.from('lineas_orden').delete().eq('id', id)
    }
    setLineas(lineas.filter(l => l.id !== id))
    toast.success('Línea eliminada')
  }

  const handleGuardar = async () => {
    if (!tallerId) {
      toast.error('Error: Taller no identificado')
      return
    }

    if (!formData.cliente_id) {
      toast.error('Selecciona un cliente')
      return
    }

    setGuardando(true)
    try {
      const ordenData = {
        taller_id: tallerId,
        numero_orden: ordenNumero,
        estado: formData.estado,
        cliente_id: formData.cliente_id || null,
        vehiculo_id: formData.vehiculo_id || null,
        descripcion_problema: formData.descripcion_problema,
        diagnostico: formData.diagnostico,
        trabajos_realizados: formData.trabajos_realizados,
        notas: formData.notas,
        presupuesto_aprobado_por_cliente: formData.presupuesto_aprobado_por_cliente,
        tiempo_estimado_horas: formData.tiempo_estimado_horas,
        tiempo_real_horas: formData.tiempo_real_horas,
        subtotal_mano_obra: totales.manoObra,
        subtotal_piezas: totales.piezas,
        iva_amount: totales.iva,
        total_con_iva: totales.total,
        fotos_entrada: formData.fotos_entrada,
        fotos_salida: formData.fotos_salida,
      }

      let ordenId = ordenSeleccionada

      if (modoCrear) {
        const { data, error } = await supabase
          .from('ordenes_reparacion')
          .insert([ordenData])
          .select('id')
          .single()

        if (error) throw error
        ordenId = data.id
        toast.success('Orden creada correctamente')
      } else {
        const { error } = await supabase
          .from('ordenes_reparacion')
          .update({
            ...ordenData,
            updated_at: new Date().toISOString()
          })
          .eq('id', ordenSeleccionada)

        if (error) throw error
        toast.success('Orden actualizada')
      }

      // Guardar líneas nuevas
      const lineasNuevas = lineas.filter(l => l.isNew)
      if (lineasNuevas.length > 0 && ordenId) {
        const { error: lineasError } = await supabase
          .from('lineas_orden')
          .insert(lineasNuevas.map(l => ({
            orden_id: ordenId,
            tipo: l.tipo,
            descripcion: l.descripcion,
            cantidad: l.cantidad,
            precio_unitario: l.precio_unitario,
            importe_total: l.cantidad * l.precio_unitario
          })))

        if (lineasError) {
          console.error('Error guardando líneas:', lineasError)
        }
      }

      onActualizar()
      onClose()
    } catch (error: any) {
      console.error('Error guardando:', error)
      toast.error(error.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleGenerarFactura = async () => {
    if (!ordenSeleccionada || !tallerId) {
      toast.error('Datos incompletos')
      return
    }

    // Primero guardar cambios
    setGuardando(true)
    try {
      const ordenData = {
        estado: formData.estado,
        cliente_id: formData.cliente_id || null,
        vehiculo_id: formData.vehiculo_id || null,
        descripcion_problema: formData.descripcion_problema,
        diagnostico: formData.diagnostico,
        trabajos_realizados: formData.trabajos_realizados,
        notas: formData.notas,
        presupuesto_aprobado_por_cliente: formData.presupuesto_aprobado_por_cliente,
        tiempo_estimado_horas: formData.tiempo_estimado_horas,
        tiempo_real_horas: formData.tiempo_real_horas,
        subtotal_mano_obra: totales.manoObra,
        subtotal_piezas: totales.piezas,
        iva_amount: totales.iva,
        total_con_iva: totales.total,
        fotos_entrada: formData.fotos_entrada,
        fotos_salida: formData.fotos_salida,
        updated_at: new Date().toISOString()
      }

      await supabase
        .from('ordenes_reparacion')
        .update(ordenData)
        .eq('id', ordenSeleccionada)

    } catch (error) {
      console.error('Error guardando antes de facturar:', error)
    } finally {
      setGuardando(false)
    }

    setGenerandoFactura(true)
    try {
      const res = await fetch('/api/facturas/desde-orden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orden_id: ordenSeleccionada,
          taller_id: tallerId
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al generar factura')
      }

      toast.success(`Factura ${data.numero_factura} creada`)
      onActualizar()
      router.push(`/dashboard/facturas/ver?id=${data.id}`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setGenerandoFactura(false)
    }
  }

  const cambiarEstado = (nuevoEstado: string) => {
    setFormData(prev => ({ ...prev, estado: nuevoEstado }))
    setMostrarEstados(false)
  }

  const estadoActual = ESTADOS.find(e => e.value === formData.estado) || ESTADOS[0]
  const vehiculoSeleccionado = vehiculos.find(v => v.id === formData.vehiculo_id)

  if (cargando) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-sky-600" />
          <p className="text-gray-600">Cargando orden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-gray-50 shadow-xl flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {modoCrear ? 'Nueva Orden' : ordenNumero}
            </h2>
            <p className="text-xs text-gray-500">
              {modoCrear ? 'Crear nueva orden de trabajo' : 'Editar orden'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de estado */}
        <div className="bg-white border-b px-4 py-3 shrink-0">
          <Label className="text-xs text-gray-500 mb-2 block">Estado de la orden</Label>
          <div className="relative">
            <button
              onClick={() => setMostrarEstados(!mostrarEstados)}
              className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 transition-all ${estadoActual.color} text-white`}
            >
              <span className="flex items-center gap-2 font-medium">
                <span>{estadoActual.icon}</span>
                {estadoActual.label}
              </span>
              <ChevronDown className={`w-5 h-5 transition-transform ${mostrarEstados ? 'rotate-180' : ''}`} />
            </button>

            {mostrarEstados && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border z-10 overflow-hidden max-h-64 overflow-y-auto">
                {ESTADOS.map(estado => (
                  <button
                    key={estado.value}
                    onClick={() => cambiarEstado(estado.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      formData.estado === estado.value ? 'bg-gray-100' : ''
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${estado.color}`} />
                    <span className="flex-1 text-left font-medium">{estado.label}</span>
                    {formData.estado === estado.value && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b flex shrink-0 overflow-x-auto">
          {[
            { id: 'info', label: 'Info', icon: '📋' },
            { id: 'fotos', label: 'Fotos', icon: '📸' },
            { id: 'trabajo', label: 'Trabajo', icon: '🔧' },
            { id: 'items', label: 'Líneas', icon: '💰' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-2 ${
                tab === t.id
                  ? 'border-sky-600 text-sky-600 bg-sky-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'info' && (
            <>
              {/* Cliente */}
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-2 block">Cliente *</Label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, cliente_id: e.target.value, vehiculo_id: '' }))}
                  className="w-full px-3 py-3 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.nif ? `(${c.nif})` : ''}
                    </option>
                  ))}
                </select>
              </Card>

              {/* Vehículo */}
              {formData.cliente_id && (
                <Card className="p-4">
                  <Label className="text-sm font-semibold mb-2 block">Vehículo</Label>
                  <select
                    value={formData.vehiculo_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehiculo_id: e.target.value }))}
                    className="w-full px-3 py-3 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="">Seleccionar vehículo...</option>
                    {vehiculos.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.matricula} - {v.marca} {v.modelo}
                      </option>
                    ))}
                  </select>

                  {vehiculoSeleccionado && (
                    <div className="mt-3 p-3 bg-sky-50 rounded-lg border border-sky-200 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500">Matrícula:</span>
                          <span className="ml-2 font-bold">{vehiculoSeleccionado.matricula}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">KM:</span>
                          <span className="ml-2 font-bold">{vehiculoSeleccionado.km_actual?.toLocaleString() || '—'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Descripción del problema */}
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-2 block">
                  Descripción del problema / Motivo de entrada
                </Label>
                <Textarea
                  value={formData.descripcion_problema || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion_problema: e.target.value }))}
                  placeholder="Describe el problema que presenta el vehículo..."
                  rows={3}
                  className="resize-none"
                />
              </Card>

              {/* Autorización */}
              <Card className="p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.presupuesto_aprobado_por_cliente || false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      presupuesto_aprobado_por_cliente: e.target.checked
                    }))}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Cliente autoriza reparación</span>
                    <p className="text-xs text-gray-500">El cliente ha dado su aprobación para realizar los trabajos</p>
                  </div>
                </label>
              </Card>

              {/* Notas */}
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-2 block">Notas internas</Label>
                <Textarea
                  value={formData.notas || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Notas para el equipo del taller..."
                  rows={2}
                  className="resize-none"
                />
              </Card>
            </>
          )}

          {tab === 'fotos' && (
            <>
              {/* Fotos de entrada */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-5 h-5 text-sky-600" />
                  <Label className="text-sm font-semibold">Fotos de entrada</Label>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  URL de las fotos del vehículo al entrar al taller
                </p>
                <Textarea
                  value={formData.fotos_entrada || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, fotos_entrada: e.target.value }))}
                  placeholder="URLs de las fotos separadas por comas..."
                  rows={2}
                  className="resize-none text-sm"
                />
                {formData.fotos_entrada && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {formData.fotos_entrada.split(',').slice(0, 6).map((url, i) => (
                      <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img src={url.trim()} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Fotos de salida */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-5 h-5 text-green-600" />
                  <Label className="text-sm font-semibold">Fotos de salida</Label>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  URL de las fotos del vehículo al salir del taller
                </p>
                <Textarea
                  value={formData.fotos_salida || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, fotos_salida: e.target.value }))}
                  placeholder="URLs de las fotos separadas por comas..."
                  rows={2}
                  className="resize-none text-sm"
                />
                {formData.fotos_salida && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {formData.fotos_salida.split(',').slice(0, 6).map((url, i) => (
                      <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img src={url.trim()} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}

          {tab === 'trabajo' && (
            <>
              {/* Diagnóstico */}
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-2 block">Diagnóstico técnico</Label>
                <Textarea
                  value={formData.diagnostico || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnostico: e.target.value }))}
                  placeholder="Resultado del diagnóstico del vehículo..."
                  rows={3}
                  className="resize-none"
                />
              </Card>

              {/* Trabajos realizados */}
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-2 block">Trabajos realizados</Label>
                <Textarea
                  value={formData.trabajos_realizados || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, trabajos_realizados: e.target.value }))}
                  placeholder="Describe los trabajos que se han realizado..."
                  rows={3}
                  className="resize-none"
                />
              </Card>

              {/* Tiempos con selector de fracciones */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-sky-600" />
                  <Label className="text-sm font-semibold">Tiempo de trabajo</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Horas estimadas */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block">Horas estimadas</Label>
                    <select
                      value={formData.tiempo_estimado_horas || 0}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        tiempo_estimado_horas: parseFloat(e.target.value)
                      }))}
                      className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white text-center"
                    >
                      <option value="0">Sin estimar</option>
                      {FRACCIONES_HORA.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Horas reales */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block">Horas reales</Label>
                    <select
                      value={formData.tiempo_real_horas || 0}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        tiempo_real_horas: parseFloat(e.target.value)
                      }))}
                      className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white text-center"
                    >
                      <option value="0">Sin registrar</option>
                      {FRACCIONES_HORA.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Input manual para valores personalizados */}
                <div className="mt-3 pt-3 border-t">
                  <Label className="text-xs text-gray-500 mb-2 block">O introduce un valor personalizado:</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      min="0"
                      step="0.25"
                      value={formData.tiempo_estimado_horas || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        tiempo_estimado_horas: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="Estimadas"
                      className="text-center"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.25"
                      value={formData.tiempo_real_horas || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        tiempo_real_horas: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="Reales"
                      className="text-center"
                    />
                  </div>
                </div>
              </Card>
            </>
          )}

          {tab === 'items' && (
            <>
              {/* Añadir línea */}
              <Card className="p-4 border-2 border-dashed border-sky-200 bg-sky-50/50">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Añadir línea de trabajo
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Tipo de trabajo</Label>
                    <select
                      value={nuevaLinea.tipo}
                      onChange={(e) => setNuevaLinea(prev => ({ ...prev, tipo: e.target.value as any }))}
                      className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      <option value="mano_obra">🔧 Mano de obra</option>
                      <option value="pieza">⚙️ Recambio / Pieza</option>
                      <option value="servicio">🛠️ Servicio externo</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Descripción del trabajo</Label>
                    <Input
                      value={nuevaLinea.descripcion}
                      onChange={(e) => setNuevaLinea(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Ej: Cambio de aceite y filtro"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">
                        {nuevaLinea.tipo === 'mano_obra' ? '⏱️ Horas de trabajo' : '📦 Cantidad (uds)'}
                      </Label>
                      {nuevaLinea.tipo === 'mano_obra' ? (
                        <select
                          value={nuevaLinea.cantidad}
                          onChange={(e) => setNuevaLinea(prev => ({
                            ...prev,
                            cantidad: parseFloat(e.target.value)
                          }))}
                          className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white text-center"
                        >
                          {FRACCIONES_HORA.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={nuevaLinea.cantidad}
                          onChange={(e) => setNuevaLinea(prev => ({
                            ...prev,
                            cantidad: parseFloat(e.target.value)
                          }))}
                          className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white text-center"
                        >
                          {CANTIDADES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">
                        {nuevaLinea.tipo === 'mano_obra' ? '💶 Precio/hora (€)' : '💶 Precio/unidad (€)'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={nuevaLinea.precio_unitario || ''}
                        onChange={(e) => setNuevaLinea(prev => ({
                          ...prev,
                          precio_unitario: parseFloat(e.target.value) || 0
                        }))}
                        placeholder="0.00"
                        className="text-right"
                      />
                    </div>
                  </div>

                  {nuevaLinea.cantidad > 0 && nuevaLinea.precio_unitario > 0 && (
                    <div className="p-2 bg-green-100 rounded-lg text-center">
                      <span className="text-sm text-gray-600">Subtotal: </span>
                      <span className="font-bold text-green-700">
                        €{(nuevaLinea.cantidad * nuevaLinea.precio_unitario).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <Button onClick={agregarLinea} className="w-full gap-2 bg-sky-600 hover:bg-sky-700">
                    <Plus className="w-4 h-4" />
                    Añadir línea
                  </Button>
                </div>
              </Card>

              {/* Lista de líneas */}
              {lineas.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Líneas añadidas ({lineas.length})
                  </h3>
                  <div className="space-y-2">
                    {lineas.map(linea => (
                      <div
                        key={linea.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{linea.descripcion}</p>
                          <p className="text-sm text-gray-500">
                            {linea.cantidad} x €{linea.precio_unitario.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            €{(linea.cantidad * linea.precio_unitario).toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => eliminarLinea(linea.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Resumen */}
              <Card className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                <h3 className="font-semibold mb-3">Resumen</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mano de obra:</span>
                    <span>€{totales.manoObra.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Recambios:</span>
                    <span>€{totales.piezas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Servicios:</span>
                    <span>€{totales.servicios.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-2 flex justify-between">
                    <span className="text-gray-400">Subtotal:</span>
                    <span>€{totales.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">IVA (21%):</span>
                    <span>€{totales.iva.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-2 flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-green-400">€{totales.total.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t p-4 space-y-2 shrink-0">
          {!modoCrear && ['completado', 'entregado', 'en_reparacion', 'aprobado'].includes(formData.estado) && (
            <Button
              onClick={handleGenerarFactura}
              disabled={generandoFactura || guardando}
              className="w-full gap-2 bg-green-600 hover:bg-green-700 py-3"
            >
              {generandoFactura ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {generandoFactura ? 'Generando...' : 'Generar Factura'}
            </Button>
          )}

          <Button
            onClick={handleGuardar}
            disabled={guardando || !formData.cliente_id}
            className="w-full gap-2 py-3 bg-sky-600 hover:bg-sky-700"
          >
            {guardando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {guardando ? 'Guardando...' : (modoCrear ? 'Crear Orden' : 'Guardar Cambios')}
          </Button>
        </div>
      </div>
    </div>
  )
}
