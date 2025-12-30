'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Save, Plus, Trash2, Loader2, Camera, MessageCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { WhatsAppLink } from './whatsapp-link'
import { FotoUploader } from './foto-uploader'

interface Orden {
  id?: string
  numero_orden?: string
  estado: string
  cliente_id: string
  vehiculo_id: string
  clientes?: { nombre: string; nif?: string; telefono?: string; email?: string; direccion?: string }
  vehiculos?: { marca: string; modelo: string; matricula: string }
  descripcion_problema?: string
  diagnostico?: string
  trabajos_realizados?: string
  fotos_entrada?: string
  fotos_lado_izquierdo?: string
  fotos_lado_derecho?: string
  fotos_trasera?: string
  fotos_salida?: string
  km_entrada_extraido?: number
  matricula_extraida?: string
  presupuesto_aprobado_por_cliente?: boolean
  telefono_cliente?: string
  nif_cliente?: string
  fecha_prevista_entrega?: string
  coste_diario_estancia?: number
  dias_estimados?: number
  autorizacion_cliente_confirmada?: boolean
  tiempo_estimado_horas?: number
  tiempo_real_horas?: number
  subtotal_mano_obra?: number
  subtotal_piezas?: number
  iva_amount?: number
  total_con_iva?: number
  tiempo_estancia_contable?: boolean
}

interface DetalleOrdenSheetProps {
  ordenSeleccionada?: string | null
  ordenes?: Orden[]
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
}

export function DetalleOrdenSheet({
  ordenSeleccionada,
  ordenes = [],
  onClose,
  onActualizar,
  modoCrear = false
}: DetalleOrdenSheetProps) {
  const router = useRouter()
  const supabase = createClient()
  const [guardando, setGuardando] = useState(false)
  const [generandoFactura, setGenerandoFactura] = useState(false)
  const [tab, setTab] = useState<'info' | 'diagnostico' | 'items'>('info')
  const [lineas, setLineas] = useState<Linea[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [modoCliente, setModoCliente] = useState<'seleccionar' | 'crear'>('seleccionar')
  const [tallerId, setTallerId] = useState<string>('')
  
  const [nuevaLinea, setNuevaLinea] = useState({
    tipo: 'mano_obra' as const,
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0
  })

  const orden = !modoCrear && ordenSeleccionada ? ordenes.find(o => o.id === ordenSeleccionada) : null

  const [formData, setFormData] = useState<Orden>({
    estado: orden?.estado || 'recibido',
    cliente_id: orden?.cliente_id || '',
    vehiculo_id: orden?.vehiculo_id || '',
    descripcion_problema: orden?.descripcion_problema || '',
    diagnostico: orden?.diagnostico || '',
    trabajos_realizados: orden?.trabajos_realizados || '',
    fotos_entrada: orden?.fotos_entrada || '',
    fotos_lado_izquierdo: orden?.fotos_lado_izquierdo || '',
    fotos_lado_derecho: orden?.fotos_lado_derecho || '',
    fotos_trasera: orden?.fotos_trasera || '',
    fotos_salida: orden?.fotos_salida || '',
    km_entrada_extraido: orden?.km_entrada_extraido || 0,
    matricula_extraida: orden?.matricula_extraida || '',
    presupuesto_aprobado_por_cliente: orden?.presupuesto_aprobado_por_cliente || false,
    telefono_cliente: orden?.telefono_cliente || '',
    nif_cliente: orden?.nif_cliente || '',
    fecha_prevista_entrega: orden?.fecha_prevista_entrega || '',
    coste_diario_estancia: orden?.coste_diario_estancia || 0,
    dias_estimados: orden?.dias_estimados || 1,
    autorizacion_cliente_confirmada: orden?.autorizacion_cliente_confirmada || false,
    tiempo_estimado_horas: orden?.tiempo_estimado_horas || 0,
    tiempo_real_horas: orden?.tiempo_real_horas || 0,
    tiempo_estancia_contable: orden?.tiempo_estancia_contable ?? true,
  })

  const [clienteNuevo, setClienteNuevo] = useState({
    nombre: '',
    nif: '',
    telefono: '',
  })

  useEffect(() => {
    obtenerTallerId()
  }, [])

  useEffect(() => {
    if (tallerId) {
      cargarClientes()
    }
  }, [tallerId])

  const obtenerTallerId = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        toast.error('No autenticado')
        return
      }

      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('taller_id')
        .eq('email', session.user.email)
        .single()

      if (error || !usuario) {
        toast.error('No se pudo obtener taller_id')
        return
      }

      console.log('✅ Taller ID obtenido:', usuario.taller_id)
      setTallerId(usuario.taller_id)
    } catch (error: any) {
      console.error('❌ Error obtener taller:', error)
    }
  }

  const cargarClientes = async () => {
    try {
      // ✅ FIX 1: PASAR taller_id EN QUERY
      const res = await fetch(`/api/clientes?taller_id=${tallerId}`)
      const data = await res.json()
      console.log('📋 Clientes cargados:', data.length)
      setClientes(data)
    } catch (error) {
      console.error('Error cargando clientes:', error)
    }
  }

  const crearCliente = async () => {
    if (!clienteNuevo.nombre || !clienteNuevo.nif) {
      toast.error('Nombre y NIF requeridos')
      return
    }

    if (!tallerId) {
      toast.error('Taller no cargado')
      return
    }

    try {
      setGuardando(true)
      const res = await fetch('/api/clientes/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...clienteNuevo,
          taller_id: tallerId
        })
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      toast.success('Cliente creado')
      setFormData(prev => ({ ...prev, cliente_id: data.cliente.id }))
      setClienteNuevo({ nombre: '', nif: '', telefono: '' })
      setModoCliente('seleccionar')
      await cargarClientes()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setGuardando(false)
    }
  }

  const agregarLinea = () => {
    const linea: Linea = {
      id: Date.now().toString(),
      ...nuevaLinea
    }
    setLineas([...lineas, linea])
    setNuevaLinea({ tipo: 'mano_obra', descripcion: '', cantidad: 1, precio_unitario: 0 })
  }

  const eliminarLinea = (id: string) => {
    setLineas(lineas.filter(l => l.id !== id))
  }

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

  const handleGuardar = async () => {
    try {
      setGuardando(true)

      if (!tallerId) {
        toast.error('Taller no cargado')
        return
      }

      if (modoCrear) {
        const res = await fetch('/api/ordenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taller_id: tallerId,
            numero_orden: `ORD-${Date.now()}`,
            cliente_id: formData.cliente_id,
            vehiculo_id: formData.vehiculo_id,
            descripcion_problema: formData.descripcion_problema,
            kilometros_entrada: formData.km_entrada_extraido,
            fotos_entrada: formData.fotos_entrada,
            estado: 'recibido',
            subtotal_mano_obra: totales.manoObra,
            subtotal_piezas: totales.piezas,
            subtotal: totales.subtotal,
            iva_amount: totales.iva,
            total_con_iva: totales.total,
          })
        })

        if (!res.ok) throw new Error('Error creando orden')
        toast.success('✅ Orden creada')
      } else {
        if (!orden?.id) return

        const res = await fetch('/api/ordenes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: orden.id,
            ...formData,
            subtotal_mano_obra: totales.manoObra,
            subtotal_piezas: totales.piezas,
            subtotal: totales.subtotal,
            iva_amount: totales.iva,
            total_con_iva: totales.total,
          })
        })

        if (!res.ok) throw new Error('Error actualizando orden')
        toast.success('✅ Orden actualizada')
      }

      onActualizar()
      onClose()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleGenerarFactura = async () => {
    if (!orden?.id || !tallerId) {
      toast.error('Datos incompletos para generar factura')
      return
    }

    // Verificar estado
    if (!['completado', 'entregado', 'en_reparacion'].includes(formData.estado)) {
      toast.error('La orden debe estar en reparación o completada para generar factura')
      return
    }

    setGenerandoFactura(true)
    try {
      const res = await fetch('/api/facturas/desde-orden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orden_id: orden.id,
          taller_id: tallerId
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al generar factura')
      }

      toast.success(`Factura ${data.numero_factura} creada correctamente`)

      // Navegar a ver la factura
      router.push(`/dashboard/facturas/ver?id=${data.id}`)
      onClose()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setGenerandoFactura(false)
    }
  }

  const clienteSeleccionado = clientes.find(c => c.id === formData.cliente_id)

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-50">
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {modoCrear ? 'Nueva Orden' : orden?.numero_orden}
          </h2>
          <button onClick={onClose} className="p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2 border-b">
            {['info', 'diagnostico', 'items'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t as any)}
                className={`px-4 py-2 font-medium border-b-2 text-sm ${
                  tab === t
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600'
                }`}
              >
                {t === 'info' ? 'ℹ️ Info' : t === 'diagnostico' ? '🔍 Diag' : '📋 Items'}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <div className="space-y-4">
              <Card className="p-4 border-l-4 border-l-blue-600">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">👤</span>
                  <h3 className="font-bold text-lg">Cliente</h3>
                </div>

                {modoCliente === 'seleccionar' ? (
                  <>
                    <select
                      value={formData.cliente_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, cliente_id: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Selecciona cliente --</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre} ({c.nif})</option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setModoCliente('crear')}
                    >
                      <Plus className="w-4 h-4" />
                      Crear nuevo cliente
                    </Button>

                    {clienteSeleccionado && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm space-y-2 border border-blue-200">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Nombre:</span>
                          <span className="font-bold">{clienteSeleccionado.nombre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">NIF:</span>
                          <span className="font-bold">{clienteSeleccionado.nif}</span>
                        </div>
                        {clienteSeleccionado.telefono && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Teléfono:</span>
                            <span className="font-bold">{clienteSeleccionado.telefono}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <Input
                      placeholder="Nombre completo"
                      value={clienteNuevo.nombre}
                      onChange={(e) => setClienteNuevo(prev => ({ ...prev, nombre: e.target.value }))}
                    />
                    <Input
                      placeholder="NIF/CIF"
                      value={clienteNuevo.nif}
                      onChange={(e) => setClienteNuevo(prev => ({ ...prev, nif: e.target.value }))}
                    />
                    <Input
                      placeholder="Teléfono (opcional)"
                      value={clienteNuevo.telefono}
                      onChange={(e) => setClienteNuevo(prev => ({ ...prev, telefono: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={crearCliente}
                        disabled={guardando}
                        className="flex-1"
                      >
                        {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Guardar cliente
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setModoCliente('seleccionar')}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              {/* FOTOS */}
              <Card className="p-4 border-l-4 border-l-green-600">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">📸</span>
                  <h3 className="font-bold text-lg">Fotografías</h3>
                </div>
                <p className="text-xs text-gray-600 mb-4">Click para tomar foto (OCR automático en entrada)</p>
                
                <div className="space-y-4">
                  <FotoUploader
                    tipo="entrada"
                    fotoUrl={formData.fotos_entrada}
                    ordenId={orden?.id || 'nueva'}
                    onFotoSubida={(url) => setFormData(prev => ({ ...prev, fotos_entrada: url }))}
                    onOCRData={(data) => {
                      if (data.km) setFormData(prev => ({ ...prev, km_entrada_extraido: data.km }))
                      if (data.matricula) setFormData(prev => ({ ...prev, matricula_extraida: data.matricula }))
                    }}
                  />

                  <FotoUploader
                    tipo="izquierda"
                    fotoUrl={formData.fotos_lado_izquierdo}
                    ordenId={orden?.id || 'nueva'}
                    onFotoSubida={(url) => setFormData(prev => ({ ...prev, fotos_lado_izquierdo: url }))}
                  />

                  <FotoUploader
                    tipo="derecha"
                    fotoUrl={formData.fotos_lado_derecho}
                    ordenId={orden?.id || 'nueva'}
                    onFotoSubida={(url) => setFormData(prev => ({ ...prev, fotos_lado_derecho: url }))}
                  />

                  <FotoUploader
                    tipo="trasera"
                    fotoUrl={formData.fotos_trasera}
                    ordenId={orden?.id || 'nueva'}
                    onFotoSubida={(url) => setFormData(prev => ({ ...prev, fotos_trasera: url }))}
                  />

                  <FotoUploader
                    tipo="salida"
                    fotoUrl={formData.fotos_salida}
                    ordenId={orden?.id || 'nueva'}
                    onFotoSubida={(url) => setFormData(prev => ({ ...prev, fotos_salida: url }))}
                  />
                </div>
              </Card>

              {/* DATOS ENTRADA */}
              <Card className="p-4 border-l-4 border-l-orange-600">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🚗</span>
                  <h3 className="font-bold text-lg">Datos a la entrada</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">KM a la entrada</Label>
                    <Input
                      type="number"
                      placeholder="Ej: 245000"
                      value={formData.km_entrada_extraido || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, km_entrada_extraido: parseInt(e.target.value) }))}
                      className="font-bold text-lg"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">Matrícula</Label>
                    <Input
                      placeholder="Ej: AB-1234-CD"
                      value={formData.matricula_extraida || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, matricula_extraida: e.target.value }))}
                      className="font-bold text-lg uppercase"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">Teléfono cliente</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="+34 666 123 456"
                        value={formData.telefono_cliente || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefono_cliente: e.target.value }))}
                      />
                      <WhatsAppLink telefono={formData.telefono_cliente || ''} />
                    </div>
                  </div>
                </div>
              </Card>

              {/* TIEMPO ESTANCIA */}
              <Card className="p-4 border-l-4 border-l-purple-600">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">⏰</span>
                  <h3 className="font-bold text-lg">Tiempo de estancia</h3>
                </div>
                
                <p className="text-xs text-gray-600 mb-3">Si el coche se queda varios días</p>
                
                <label className="flex items-center gap-2 p-3 border border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50 transition-all mb-4">
                  <input
                    type="checkbox"
                    checked={formData.tiempo_estancia_contable ?? true}
                    onChange={(e) => setFormData(prev => ({ ...prev, tiempo_estancia_contable: e.target.checked }))}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                  <span className="font-medium">✓ Tiempo contable (se cobra)</span>
                </label>

                {formData.tiempo_estancia_contable ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <Label className="text-xs font-semibold text-gray-700 mb-1 block">Días estimados</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={formData.dias_estimados || 1}
                          onChange={(e) => setFormData(prev => ({ ...prev, dias_estimados: parseInt(e.target.value) || 1 }))}
                          className="font-bold text-center text-lg"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs font-semibold text-gray-700 mb-1 block">Coste/día (€)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={formData.coste_diario_estancia || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, coste_diario_estancia: parseFloat(e.target.value) }))}
                          className="font-bold text-center text-lg"
                        />
                      </div>
                    </div>

                    {formData.dias_estimados && formData.coste_diario_estancia ? (
                      <div className="p-3 bg-purple-50 rounded-lg text-sm font-bold text-purple-700 text-center border border-purple-200">
                        💰 Coste total: €{(formData.dias_estimados * formData.coste_diario_estancia).toFixed(2)}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="p-3 bg-gray-100 rounded-lg text-sm font-bold text-gray-700 text-center border border-gray-300">
                    ✗ Sin cargo - Tiempo no contable
                  </div>
                )}
              </Card>

              {/* AUTORIZACIÓN */}
              <Card className="p-4 border-l-4 border-l-green-600">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">✅</span>
                  <h3 className="font-bold text-lg">Autorización</h3>
                </div>
                
                <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.autorizacion_cliente_confirmada || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, autorizacion_cliente_confirmada: e.target.checked }))}
                    className="w-5 h-5 rounded text-green-600"
                  />
                  <span className="font-medium">Cliente autoriza la reparación</span>
                </label>
              </Card>
            </div>
          )}

          {tab === 'diagnostico' && (
            <div className="space-y-4">
              <Card className="p-4">
                <Label className="font-bold mb-2 block">📝 Descripción del problema</Label>
                <Textarea
                  value={formData.descripcion_problema || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion_problema: e.target.value }))}
                  placeholder="¿Cuál es el problema del vehículo?"
                  rows={4}
                />
              </Card>

              <Card className="p-4">
                <Label className="font-bold mb-2 block">🔍 Diagnóstico</Label>
                <Textarea
                  value={formData.diagnostico || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnostico: e.target.value }))}
                  placeholder="¿Cuál es el diagnóstico?"
                  rows={4}
                />
              </Card>

              <Card className="p-4">
                <Label className="font-bold mb-2 block">🔧 Trabajos realizados</Label>
                <Textarea
                  value={formData.trabajos_realizados || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, trabajos_realizados: e.target.value }))}
                  placeholder="¿Qué trabajos se realizaron?"
                  rows={4}
                />
              </Card>
            </div>
          )}

          {tab === 'items' && (
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Agregar línea de trabajo
                </h3>
                <div className="space-y-3">
                  <select
                    value={nuevaLinea.tipo}
                    onChange={(e) => setNuevaLinea(prev => ({ ...prev, tipo: e.target.value as any }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mano_obra">🔨 Mano de obra</option>
                    <option value="pieza">⚙️ Pieza</option>
                    <option value="servicio">🛠️ Servicio</option>
                  </select>
                  
                  <Input
                    placeholder="Descripción (Ej: Cambio aceite)"
                    value={nuevaLinea.descripcion}
                    onChange={(e) => setNuevaLinea(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                  
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Cantidad"
                      value={nuevaLinea.cantidad}
                      onChange={(e) => setNuevaLinea(prev => ({ ...prev, cantidad: parseFloat(e.target.value) }))}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Precio €"
                      value={nuevaLinea.precio_unitario}
                      onChange={(e) => setNuevaLinea(prev => ({ ...prev, precio_unitario: parseFloat(e.target.value) }))}
                      className="flex-1"
                    />
                  </div>
                  
                  <Button onClick={agregarLinea} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    Agregar línea
                  </Button>
                </div>
              </Card>

              {lineas.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-bold mb-3">📋 Líneas agregadas ({lineas.length})</h3>
                  <div className="space-y-2">
                    {lineas.map(linea => (
                      <div key={linea.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{linea.descripcion}</p>
                          <p className="text-sm text-gray-600">{linea.cantidad} x €{linea.precio_unitario.toFixed(2)} = €{(linea.cantidad * linea.precio_unitario).toFixed(2)}</p>
                        </div>
                        <button
                          onClick={() => eliminarLinea(linea.id)}
                          className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card className="p-4 bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-50 border border-blue-200">
                <h3 className="font-bold mb-4 text-lg">💰 Resumen de costos</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Mano de obra:</span>
                    <span className="font-bold text-lg">€{totales.manoObra.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Piezas:</span>
                    <span className="font-bold text-lg">€{totales.piezas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Servicios:</span>
                    <span className="font-bold text-lg">€{totales.servicios.toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t-2 border-blue-200 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="font-bold">€{totales.subtotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">IVA (21%):</span>
                    <span className="font-bold">€{totales.iva.toFixed(2)}</span>
                  </div>

                  <div className="border-t-2 border-blue-300 pt-3 mt-3 bg-white rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total:</span>
                      <span className="text-2xl font-bold text-blue-600">€{totales.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Botón Generar Factura - Solo si no es modo crear y la orden está en estado válido */}
              {!modoCrear && orden?.id && ['completado', 'entregado', 'en_reparacion'].includes(formData.estado) && (
                <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-green-600" />
                    <h3 className="font-bold text-lg text-green-800">Generar Factura</h3>
                  </div>
                  <p className="text-sm text-green-700 mb-4">
                    Crea una factura a partir de esta orden con todos los datos y líneas de trabajo.
                  </p>
                  <Button
                    onClick={handleGenerarFactura}
                    disabled={generandoFactura}
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-bold"
                  >
                    {generandoFactura ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generando factura...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        Crear Factura desde Orden
                      </>
                    )}
                  </Button>
                </Card>
              )}
            </div>
          )}

          <Button
            onClick={handleGuardar}
            disabled={guardando || !formData.cliente_id || !tallerId}
            className="w-full py-6 text-lg font-bold gap-2 sticky bottom-4 bg-blue-600 hover:bg-blue-700 shadow-lg"
          >
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {guardando ? 'Guardando...' : (modoCrear ? '✅ Crear Orden' : '💾 Guardar Cambios')}
          </Button>
        </div>
      </div>
    </div>
  )
}
