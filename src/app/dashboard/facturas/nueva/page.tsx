'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, Plus, X, Check, UserPlus, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Cliente {
  id: string
  nombre: string
  nif: string
  telefono?: string
  email?: string
}

interface LineaFactura {
  id: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  ivaPorcentaje: number
}

interface SerieFactura {
  id: string
  codigo: string
  nombre: string
}

export default function NuevaFacturaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cargandoClientes, setCargandoClientes] = useState(true)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [lineas, setLineas] = useState<LineaFactura[]>([])
  const [tallerId, setTallerId] = useState<string | null>(null)

  // Series disponibles
  const [seriesDisponibles, setSeriesDisponibles] = useState<SerieFactura[]>([])

  // Modal crear cliente rápido
  const [mostrarCrearCliente, setMostrarCrearCliente] = useState(false)
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    nif: '',
    telefono: '',
    email: '',
    direccion: ''
  })

  // Datos de la factura
  const [formData, setFormData] = useState({
    cliente_id: '',
    serie: 'FA',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    metodo_pago: 'T',
    notas: '',
    condiciones_pago: '',
    persona_contacto: '',
    telefono_contacto: '',
  })

  // Nueva línea
  const [nuevaLinea, setNuevaLinea] = useState({
    descripcion: '',
    cantidad: '1',
    precioUnitario: '',
    ivaPorcentaje: '21',
  })

  // Porcentaje IVA por defecto
  const [ivaPorDefecto, setIvaPorDefecto] = useState(21)

  // Obtener taller_id del usuario autenticado
  useEffect(() => {
    const obtenerTallerId = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user?.email) {
          toast.error('No hay sesión activa')
          setCargandoClientes(false)
          return
        }

        const { data: usuario, error } = await supabase
          .from('usuarios')
          .select('taller_id')
          .eq('email', session.user.email)
          .single()

        if (error || !usuario) {
          toast.error('No se pudo obtener datos del usuario')
          setCargandoClientes(false)
          return
        }

        setTallerId(usuario.taller_id)
      } catch (error) {
        console.error('Error obteniendo taller_id:', error)
        toast.error('Error de autenticación')
        setCargandoClientes(false)
      }
    }
    obtenerTallerId()
  }, [])

  // Cargar clientes y configuración cuando tengamos taller_id
  useEffect(() => {
    if (tallerId) {
      fetchClientes()
      fetchConfig()
    }
  }, [tallerId])

  const fetchConfig = async () => {
    if (!tallerId) return

    try {
      const response = await fetch(`/api/taller/config/obtener?taller_id=${tallerId}`)
      const data = await response.json()

      if (data) {
        setIvaPorDefecto(data.porcentaje_iva || 21)
        setNuevaLinea(prev => ({ ...prev, ivaPorcentaje: String(data.porcentaje_iva || 21) }))

        // Cargar series dinámicamente desde la base de datos
        fetchSeries()

        setFormData(prev => ({
          ...prev,
          serie: data.serie_factura || 'FA',
          condiciones_pago: data.condiciones_pago || ''
        }))
      }
    } catch (error) {
      console.error('Error cargando config:', error)
    }
  }

  const fetchSeries = async () => {
    if (!tallerId) return

    try {
      const response = await fetch(`/api/series/obtener?taller_id=${tallerId}`)
      const data = await response.json()

      if (data.series && data.series.length > 0) {
        const seriesFormateadas = data.series.map((s: any) => ({
          id: s.id,
          codigo: s.prefijo,
          nombre: s.nombre
        }))
        setSeriesDisponibles(seriesFormateadas)

        // Si no hay serie seleccionada, usar la primera disponible
        if (!formData.serie && seriesFormateadas.length > 0) {
          setFormData(prev => ({ ...prev, serie: seriesFormateadas[0].codigo }))
        }
      } else {
        // Si no hay series, mostrar advertencia
        toast.warning('No hay series de facturación configuradas. Ve a Configuración para crear una.')
        setSeriesDisponibles([])
      }
    } catch (error) {
      console.error('Error cargando series:', error)
      toast.error('Error al cargar series de facturación')
    }
  }

  const fetchClientes = async () => {
    if (!tallerId) return

    try {
      setCargandoClientes(true)
      const response = await fetch(`/api/clientes/obtener?taller_id=${tallerId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        setClientes(data || [])
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error)
      toast.error('Error al cargar clientes')
    } finally {
      setCargandoClientes(false)
    }
  }

  // Crear cliente rápido
  const handleCrearCliente = async () => {
    if (!nuevoCliente.nombre) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (!tallerId) {
      toast.error('No se encontró el taller')
      return
    }

    setCreandoCliente(true)
    try {
      const response = await fetch('/api/clientes/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taller_id: tallerId,
          nombre: nuevoCliente.nombre,
          nif: nuevoCliente.nif || null,
          telefono: nuevoCliente.telefono || null,
          email: nuevoCliente.email || null,
          direccion: nuevoCliente.direccion || null,
          tipo: 'particular'
        })
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success('Cliente creado correctamente')
        const nuevoClienteData = {
          id: data.id,
          nombre: nuevoCliente.nombre,
          nif: nuevoCliente.nif || '',
          telefono: nuevoCliente.telefono,
          email: nuevoCliente.email
        }
        setClientes([...clientes, nuevoClienteData])
        setFormData({ ...formData, cliente_id: data.id })
        setMostrarCrearCliente(false)
        setNuevoCliente({ nombre: '', nif: '', telefono: '', email: '', direccion: '' })
      }
    } catch (error) {
      console.error('Error creando cliente:', error)
      toast.error('Error al crear cliente')
    } finally {
      setCreandoCliente(false)
    }
  }

  const handleAgregarLinea = () => {
    if (!nuevaLinea.descripcion || !nuevaLinea.cantidad || !nuevaLinea.precioUnitario) {
      toast.error('Completa todos los campos de la línea')
      return
    }

    const linea: LineaFactura = {
      id: Date.now().toString(),
      descripcion: nuevaLinea.descripcion,
      cantidad: parseFloat(nuevaLinea.cantidad),
      precioUnitario: parseFloat(nuevaLinea.precioUnitario),
      ivaPorcentaje: parseFloat(nuevaLinea.ivaPorcentaje) || ivaPorDefecto,
    }

    setLineas([...lineas, linea])
    setNuevaLinea({
      descripcion: '',
      cantidad: '1',
      precioUnitario: '',
      ivaPorcentaje: String(ivaPorDefecto),
    })
  }

  const handleEliminarLinea = (id: string) => {
    setLineas(lineas.filter((l) => l.id !== id))
  }

  // Cuando se selecciona un cliente, auto-rellenar contacto
  const handleClienteChange = (clienteId: string) => {
    setFormData({ ...formData, cliente_id: clienteId })
    const cliente = clientes.find(c => c.id === clienteId)
    if (cliente) {
      setFormData(prev => ({
        ...prev,
        cliente_id: clienteId,
        persona_contacto: prev.persona_contacto || cliente.nombre,
        telefono_contacto: prev.telefono_contacto || cliente.telefono || ''
      }))
    }
  }

  const handleGuardar = async () => {
    if (!formData.cliente_id || lineas.length === 0) {
      toast.error('Selecciona cliente y agrega al menos una línea')
      return
    }

    if (!tallerId) {
      toast.error('No se encontró el taller')
      return
    }

    setLoading(true)
    try {
      const baseImponible = lineas.reduce(
        (sum, l) => sum + l.cantidad * l.precioUnitario,
        0
      )
      const iva = lineas.reduce(
        (sum, l) => sum + (l.cantidad * l.precioUnitario * l.ivaPorcentaje / 100),
        0
      )
      const total = baseImponible + iva

      const response = await fetch('/api/facturas/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taller_id: tallerId,
          cliente_id: formData.cliente_id,
          serie: formData.serie,
          fecha_emision: formData.fecha_emision,
          fecha_vencimiento: formData.fecha_vencimiento,
          base_imponible: baseImponible,
          iva,
          total,
          metodo_pago: formData.metodo_pago,
          notas_internas: formData.notas,
          condiciones_pago: formData.condiciones_pago,
          persona_contacto: formData.persona_contacto,
          telefono_contacto: formData.telefono_contacto,
          estado: 'borrador',
          lineas: lineas.map(l => ({
            descripcion: l.descripcion,
            cantidad: l.cantidad,
            precioUnitario: l.precioUnitario,
            iva_porcentaje: l.ivaPorcentaje
          })),
        }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success(`Factura ${data.numero_factura} creada`)
        router.push(`/dashboard/facturas/ver?id=${data.id}`)
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al crear factura')
    } finally {
      setLoading(false)
    }
  }

  // Calcular totales
  const baseImponible = lineas.reduce((sum, l) => sum + l.cantidad * l.precioUnitario, 0)
  const ivaTotal = lineas.reduce((sum, l) => sum + (l.cantidad * l.precioUnitario * l.ivaPorcentaje / 100), 0)
  const total = baseImponible + ivaTotal

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard/facturas">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nueva Factura</h1>
            <p className="text-gray-600">Factura rápida o venta directa</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* DATOS BÁSICOS */}
          <Card className="p-6 border-l-4 border-l-sky-600">
            <h2 className="font-bold text-lg mb-4 text-gray-900">Datos de la Factura</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Serie */}
              <div>
                <Label className="block text-sm font-semibold mb-2">Serie *</Label>
                <select
                  value={formData.serie}
                  onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                >
                  {seriesDisponibles.map((s) => (
                    <option key={s.id} value={s.codigo}>
                      {s.codigo} - {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cliente */}
              <div className="lg:col-span-2">
                <Label className="block text-sm font-semibold mb-2">Cliente *</Label>
                {cargandoClientes ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-600">Cargando...</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={formData.cliente_id}
                      onChange={(e) => handleClienteChange(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">Selecciona cliente</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} {c.nif ? `(${c.nif})` : ''}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMostrarCrearCliente(true)}
                      className="gap-1 shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      Nuevo
                    </Button>
                  </div>
                )}
              </div>

              {/* Persona de contacto */}
              <div>
                <Label className="block text-sm font-semibold mb-2">Persona de Contacto</Label>
                <Input
                  placeholder="Nombre de quien avisar"
                  value={formData.persona_contacto}
                  onChange={(e) => setFormData({ ...formData, persona_contacto: e.target.value })}
                />
              </div>

              {/* Teléfono contacto */}
              <div>
                <Label className="block text-sm font-semibold mb-2">Teléfono Contacto</Label>
                <Input
                  placeholder="+34 600 000 000"
                  value={formData.telefono_contacto}
                  onChange={(e) => setFormData({ ...formData, telefono_contacto: e.target.value })}
                />
              </div>

              {/* Método pago */}
              <div>
                <Label className="block text-sm font-semibold mb-2">Método de Pago</Label>
                <select
                  value={formData.metodo_pago}
                  onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="T">Transferencia</option>
                  <option value="E">Efectivo</option>
                  <option value="A">Tarjeta</option>
                  <option value="B">Bizum</option>
                  <option value="O">Otro</option>
                </select>
              </div>

              {/* Fechas */}
              <div>
                <Label className="block text-sm font-semibold mb-2">Fecha Emisión</Label>
                <Input
                  type="date"
                  value={formData.fecha_emision}
                  onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                />
              </div>

              <div>
                <Label className="block text-sm font-semibold mb-2">Fecha Vencimiento</Label>
                <Input
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                />
              </div>

              <div>
                <Label className="block text-sm font-semibold mb-2">Condiciones de Pago</Label>
                <Input
                  placeholder="Pago a 30 días"
                  value={formData.condiciones_pago}
                  onChange={(e) => setFormData({ ...formData, condiciones_pago: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label className="block text-sm font-semibold mb-2">Notas Internas</Label>
              <Textarea
                placeholder="Notas privadas (no aparecen en factura)"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                rows={2}
              />
            </div>
          </Card>

          {/* LÍNEAS */}
          <Card className="p-6 border-l-4 border-l-green-600">
            <h2 className="font-bold text-lg mb-4 text-gray-900">Conceptos</h2>

            {lineas.length > 0 && (
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead className="border-b-2 border-green-600 bg-green-50">
                    <tr>
                      <th className="text-left py-3 px-2 font-bold">Descripción</th>
                      <th className="text-center py-3 px-2 font-bold">Cant.</th>
                      <th className="text-right py-3 px-2 font-bold">Precio</th>
                      <th className="text-center py-3 px-2 font-bold">IVA</th>
                      <th className="text-right py-3 px-2 font-bold">Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((linea) => {
                      const subtotal = linea.cantidad * linea.precioUnitario
                      const ivaLinea = subtotal * linea.ivaPorcentaje / 100
                      return (
                        <tr key={linea.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2">{linea.descripcion}</td>
                          <td className="text-center py-3 px-2">{linea.cantidad}</td>
                          <td className="text-right py-3 px-2">{linea.precioUnitario.toFixed(2)}€</td>
                          <td className="text-center py-3 px-2">{linea.ivaPorcentaje}%</td>
                          <td className="text-right py-3 px-2 font-semibold">
                            {(subtotal + ivaLinea).toFixed(2)}€
                          </td>
                          <td className="text-center py-3 px-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEliminarLinea(linea.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* AGREGAR LÍNEA */}
            <div className="space-y-3 p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div>
                <Label className="block text-sm font-semibold mb-2">Descripción</Label>
                <Input
                  placeholder="Ej: Limpiaparabrisas, Cambio aceite..."
                  value={nuevaLinea.descripcion}
                  onChange={(e) => setNuevaLinea({ ...nuevaLinea, descripcion: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAgregarLinea()}
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="block text-sm font-semibold mb-2">Cantidad</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={nuevaLinea.cantidad}
                    onChange={(e) => setNuevaLinea({ ...nuevaLinea, cantidad: e.target.value })}
                    className="text-center"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-semibold mb-2">Precio (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={nuevaLinea.precioUnitario}
                    onChange={(e) => setNuevaLinea({ ...nuevaLinea, precioUnitario: e.target.value })}
                    className="text-right"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-semibold mb-2">IVA</Label>
                  <select
                    value={nuevaLinea.ivaPorcentaje}
                    onChange={(e) => setNuevaLinea({ ...nuevaLinea, ivaPorcentaje: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                  >
                    <option value="21">21%</option>
                    <option value="10">10%</option>
                    <option value="4">4%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
                <div>
                  <Label className="block text-sm font-semibold mb-2">Total</Label>
                  <div className="py-2 px-3 bg-white border border-green-200 rounded-lg font-bold text-right text-green-700">
                    {(() => {
                      const cant = parseFloat(nuevaLinea.cantidad || '0')
                      const precio = parseFloat(nuevaLinea.precioUnitario || '0')
                      const iva = parseFloat(nuevaLinea.ivaPorcentaje || '21')
                      const base = cant * precio
                      return (base + base * iva / 100).toFixed(2)
                    })()}€
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAgregarLinea}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Agregar Concepto
              </Button>
            </div>
          </Card>

          {/* RESUMEN */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-sky-600">
            <h2 className="font-bold text-lg mb-4 text-gray-900">Resumen</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Imponible:</span>
                <span className="font-semibold">{baseImponible.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA:</span>
                <span className="font-semibold">{ivaTotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-lg border-t-2 border-blue-200 pt-2 mt-2">
                <span className="font-bold text-gray-900">Total:</span>
                <span className="font-bold text-sky-600 text-xl">{total.toFixed(2)}€</span>
              </div>
            </div>
          </Card>

          {/* BOTONES */}
          <div className="flex gap-2 justify-end">
            <Link href="/dashboard/facturas">
              <Button variant="outline">Cancelar</Button>
            </Link>
            <Button
              onClick={handleGuardar}
              disabled={loading || lineas.length === 0 || !formData.cliente_id}
              className="gap-2 bg-sky-600 hover:bg-sky-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Crear Factura
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL CREAR CLIENTE */}
      {mostrarCrearCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-600" />
                Nuevo Cliente
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setMostrarCrearCliente(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Nombre *</Label>
                <Input
                  placeholder="Nombre o razón social"
                  value={nuevoCliente.nombre}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold">NIF/CIF</Label>
                  <Input
                    placeholder="12345678A"
                    value={nuevoCliente.nif}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nif: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Teléfono</Label>
                  <Input
                    placeholder="+34 600..."
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Email</Label>
                <Input
                  type="email"
                  placeholder="cliente@email.com"
                  value={nuevoCliente.email}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-sm font-semibold">Dirección</Label>
                <Input
                  placeholder="Calle, número, ciudad..."
                  value={nuevoCliente.direccion}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setMostrarCrearCliente(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 gap-2 bg-sky-600 hover:bg-sky-700"
                  onClick={handleCrearCliente}
                  disabled={creandoCliente || !nuevoCliente.nombre}
                >
                  {creandoCliente ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Crear
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
