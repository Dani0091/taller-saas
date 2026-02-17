'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NumberInput } from '@/components/ui/number-input'
import { ArrowLeft, Loader2, Plus, X, Check, UserPlus, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useTaller } from '@/contexts/TallerContext'

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
  const { tallerId, loading: loadingAuth } = useTaller()
  const [loading, setLoading] = useState(false)
  const [cargandoClientes, setCargandoClientes] = useState(true)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [lineas, setLineas] = useState<LineaFactura[]>([])

  // Series disponibles
  const [seriesDisponibles, setSeriesDisponibles] = useState<SerieFactura[]>([])

  // Modal crear cliente rápido
  const [mostrarCrearCliente, setMostrarCrearCliente] = useState(false)
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    apellidos: '',
    nif: '',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    codigo_postal: ''
  })

  // Datos de la factura
  const [formData, setFormData] = useState({
    cliente_id: '',
    serie: 'FA',
    fecha_emision: new Date().toISOString().split('T')[0],
    metodo_pago: 'T',
    notas: '',
    condiciones_pago: '',
    persona_contacto: '',
    telefono_contacto: '',
    // Campos para renting/flotas
    numero_autorizacion: '',
    referencia_externa: '',
  })

  // Nueva línea
  const [nuevaLinea, setNuevaLinea] = useState({
    descripcion: '',
    cantidad: 1,
    precioUnitario: 0,
    ivaPorcentaje: '21',
  })

  // Porcentaje IVA por defecto
  const [ivaPorDefecto, setIvaPorDefecto] = useState(21)

  // Estados para gestión de pago
  const [pagadoAlEmitir, setPagadoAlEmitir] = useState(true)
  const [plazoPago, setPlazoPago] = useState(30) // días

  // ⚡ OPTIMIZACIÓN: Cálculo derivado en lugar de useEffect (elimina re-renders)
  const fechaVencimiento = useMemo(() => {
    if (pagadoAlEmitir) {
      return formData.fecha_emision
    }
    const fecha = new Date(formData.fecha_emision)
    fecha.setDate(fecha.getDate() + plazoPago)
    return fecha.toISOString().split('T')[0]
  }, [pagadoAlEmitir, plazoPago, formData.fecha_emision])

  // ⚡ OPTIMIZACIÓN: Carga paralela de clientes, config y series
  useEffect(() => {
    if (!tallerId || loadingAuth) return

    const cargarDatosEnParalelo = async () => {
      try {
        setCargandoClientes(true)

        const supabase = createClient()

        // 🚀 Promise.all ejecuta todas las llamadas en paralelo
        const [clientesRes, configRes, seriesRes] = await Promise.all([
          supabase.from('clientes').select('id, nombre, nif, telefono, email').eq('taller_id', tallerId),
          fetch(`/api/taller/config/obtener?taller_id=${tallerId}`),
          fetch(`/api/series/obtener?taller_id=${tallerId}`)
        ])

        // Procesar clientes
        if (clientesRes.data) {
          setClientes(clientesRes.data)
        }

        // Procesar config y series en paralelo
        const [configData, seriesData] = await Promise.all([
          configRes.json(),
          seriesRes.json()
        ])

        if (configData) {
          setIvaPorDefecto(configData.porcentaje_iva || 21)
          setNuevaLinea(prev => ({ ...prev, ivaPorcentaje: String(configData.porcentaje_iva || 21) }))
          setFormData(prev => ({
            ...prev,
            serie: configData.serie_factura || 'FA'
          }))
        }

        if (seriesData.series && seriesData.series.length > 0) {
          const seriesFormateadas = seriesData.series.map((s: any) => ({
            id: s.id,
            codigo: s.prefijo,
            nombre: s.nombre
          }))
          setSeriesDisponibles(seriesFormateadas)
        }

      } catch (error) {
        console.error('Error cargando datos:', error)
        toast.error('Error al cargar datos iniciales')
      } finally {
        setCargandoClientes(false)
      }
    }

    cargarDatosEnParalelo()
  }, [tallerId, loadingAuth])

  // Crear cliente rápido
  const handleCrearCliente = async () => {
    if (!nuevoCliente.nombre) {
      toast.error('El nombre es obligatorio')
      return
    }

    // NIF OBLIGATORIO para facturación legal
    if (!nuevoCliente.nif) {
      toast.error('El NIF/CIF es obligatorio para facturación')
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
          apellidos: nuevoCliente.apellidos || null,
          nif: nuevoCliente.nif,
          telefono: nuevoCliente.telefono || null,
          email: nuevoCliente.email || null,
          direccion: nuevoCliente.direccion || null,
          ciudad: nuevoCliente.ciudad || null,
          provincia: nuevoCliente.provincia || null,
          codigo_postal: nuevoCliente.codigo_postal || null,
          tipo: 'particular'
        })
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else if (data.cliente) {
        toast.success('Cliente creado correctamente')
        // Construir nombre completo para mostrar
        const nombreCompleto = nuevoCliente.apellidos
          ? `${nuevoCliente.nombre} ${nuevoCliente.apellidos}`
          : nuevoCliente.nombre
        const nuevoClienteData = {
          id: data.cliente.id,
          nombre: nombreCompleto,
          nif: data.cliente.nif || '',
          telefono: data.cliente.telefono,
          email: data.cliente.email
        }
        setClientes([...clientes, nuevoClienteData])
        setFormData({ ...formData, cliente_id: data.cliente.id })
        setMostrarCrearCliente(false)
        setNuevoCliente({
          nombre: '', apellidos: '', nif: '', telefono: '',
          email: '', direccion: '', ciudad: '', provincia: '', codigo_postal: ''
        })
      } else {
        toast.error('Error al crear cliente: respuesta inválida')
      }
    } catch (error) {
      console.error('Error creando cliente:', error)
      toast.error('Error al crear cliente')
    } finally {
      setCreandoCliente(false)
    }
  }

  const handleAgregarLinea = () => {
    if (!nuevaLinea.descripcion || nuevaLinea.cantidad <= 0 || nuevaLinea.precioUnitario <= 0) {
      toast.error('Completa todos los campos de la línea')
      return
    }

    const linea: LineaFactura = {
      id: Date.now().toString(),
      descripcion: nuevaLinea.descripcion,
      cantidad: nuevaLinea.cantidad,
      precioUnitario: nuevaLinea.precioUnitario,
      ivaPorcentaje: parseFloat(nuevaLinea.ivaPorcentaje) || ivaPorDefecto,
    }

    setLineas([...lineas, linea])
    setNuevaLinea({
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
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

      // PASO 1: Crear borrador (sin número)
      toast.loading('Creando borrador de factura...')
      const responseCrear = await fetch('/api/facturas/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taller_id: tallerId,
          cliente_id: formData.cliente_id,
          serie: formData.serie,
          fecha_emision: formData.fecha_emision,
          fecha_vencimiento: fechaVencimiento,
          base_imponible: baseImponible,
          iva,
          total,
          metodo_pago: formData.metodo_pago,
          notas_internas: formData.notas,
          condiciones_pago: formData.condiciones_pago,
          persona_contacto: formData.persona_contacto,
          telefono_contacto: formData.telefono_contacto,
          numero_autorizacion: formData.numero_autorizacion || null,
          referencia_externa: formData.referencia_externa || null,
          lineas: lineas.map(l => ({
            descripcion: l.descripcion,
            cantidad: l.cantidad,
            precioUnitario: l.precioUnitario,
            iva_porcentaje: l.ivaPorcentaje
          })),
        }),
      })

      const dataBorrador = await responseCrear.json()

      if (dataBorrador.error) {
        toast.dismiss()
        toast.error(dataBorrador.error)
        return
      }

      // PASO 2: Emitir factura (asignar número)
      const estadoFinal = pagadoAlEmitir ? 'pagada' : 'emitida'
      toast.dismiss()
      toast.loading(`Emitiendo factura...`)

      const responseEmitir = await fetch('/api/facturas/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factura_id: dataBorrador.id,
          estado_final: estadoFinal
        }),
      })

      const dataEmitida = await responseEmitir.json()

      toast.dismiss()
      if (dataEmitida.error) {
        toast.error(`Borrador creado pero error al emitir: ${dataEmitida.error}`)
        // Aún así redirigir al borrador para que el usuario pueda emitirlo manualmente
        router.push(`/dashboard/facturas/ver?id=${dataBorrador.id}`)
      } else {
        toast.success(`✅ Factura ${dataEmitida.numero_factura} ${estadoFinal === 'pagada' ? 'emitida y pagada' : 'emitida'}`)
        router.push(`/dashboard/facturas/ver?id=${dataBorrador.id}`)
      }
    } catch (error) {
      console.error(error)
      toast.dismiss()
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

              {/* Nº Autorización (Renting/Flotas) */}
              <div>
                <Label className="block text-sm font-semibold mb-2">
                  Nº Autorización
                  <span className="text-xs text-gray-400 ml-1">(Renting)</span>
                </Label>
                <Input
                  placeholder="Ej: GT-123456"
                  value={formData.numero_autorizacion}
                  onChange={(e) => setFormData({ ...formData, numero_autorizacion: e.target.value })}
                />
              </div>

              {/* Referencia Externa */}
              <div>
                <Label className="block text-sm font-semibold mb-2">
                  Ref. Externa
                  <span className="text-xs text-gray-400 ml-1">(Opcional)</span>
                </Label>
                <Input
                  placeholder="Referencia del cliente"
                  value={formData.referencia_externa}
                  onChange={(e) => setFormData({ ...formData, referencia_externa: e.target.value })}
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

              {/* Fecha Emisión */}
              <div>
                <Label className="block text-sm font-semibold mb-2">Fecha Emisión</Label>
                <Input
                  type="date"
                  value={formData.fecha_emision}
                  onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                />
              </div>

              {/* ¿Pagado al emitir? */}
              <div className="lg:col-span-2">
                <Label className="block text-sm font-semibold mb-2">¿Pagado al emitir?</Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={pagadoAlEmitir}
                      onChange={() => setPagadoAlEmitir(true)}
                      className="w-4 h-4 text-sky-600"
                    />
                    <span className="text-sm">Sí (pagado hoy)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!pagadoAlEmitir}
                      onChange={() => setPagadoAlEmitir(false)}
                      className="w-4 h-4 text-sky-600"
                    />
                    <span className="text-sm">No (pendiente de pago)</span>
                  </label>
                </div>
              </div>

              {/* Selector de plazo (solo si NO está pagado al emitir) */}
              {!pagadoAlEmitir && (
                <div className="lg:col-span-2">
                  <Label className="block text-sm font-semibold mb-2">Plazo de pago</Label>
                  <div className="flex gap-3">
                    <select
                      value={plazoPago}
                      onChange={(e) => setPlazoPago(Number(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    >
                      <option value={15}>15 días</option>
                      <option value={30}>30 días</option>
                      <option value={60}>60 días</option>
                      <option value={90}>90 días</option>
                    </select>
                    <div className="flex items-center px-3 py-2 bg-gray-100 rounded-lg text-sm">
                      <span className="text-gray-600">Vto: </span>
                      <span className="ml-1 font-semibold">
                        {new Date(fechaVencimiento).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Fecha Vencimiento (calculada automáticamente) */}
              <div className={!pagadoAlEmitir ? '' : 'lg:col-span-2'}>
                <Label className="block text-sm font-semibold mb-2">Fecha Vencimiento</Label>
                <Input
                  type="date"
                  value={fechaVencimiento}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {pagadoAlEmitir ? 'Al contado: vencimiento = fecha de emisión' : `Calculado automáticamente: ${plazoPago} días desde emisión`}
                </p>
              </div>

              {/* Condiciones de Pago (opcional, sin valor por defecto) */}
              <div>
                <Label className="block text-sm font-semibold mb-2">
                  Condiciones de Pago
                  <span className="text-xs text-gray-400 ml-1">(Opcional)</span>
                </Label>
                <Input
                  placeholder="Ej: Pago a 30 días"
                  value={formData.condiciones_pago}
                  onChange={(e) => setFormData({ ...formData, condiciones_pago: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label className="block text-sm font-semibold mb-2">Notas Internas</Label>
              <Textarea
                placeholder="Notas privadas (no aparecen en factura). Ej: Pagado 50% tarjeta + 50% efectivo"
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
                      return (
                        <tr key={linea.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2">{linea.descripcion}</td>
                          <td className="text-center py-3 px-2">{linea.cantidad}</td>
                          <td className="text-right py-3 px-2">{linea.precioUnitario.toFixed(2)}€</td>
                          <td className="text-center py-3 px-2">{linea.ivaPorcentaje}%</td>
                          <td className="text-right py-3 px-2 font-semibold">
                            {subtotal.toFixed(2)}€
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAgregarLinea()
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-3">
                  <Label className="block text-sm font-semibold mb-2">Cantidad</Label>
                  <NumberInput
                    value={nuevaLinea.cantidad}
                    onChange={(value) => {
                      if (value != null) {
                        setNuevaLinea({ ...nuevaLinea, cantidad: value })
                      }
                    }}
                    className="text-center w-full"
                    min={0.01}
                    step={0.01}
                  />
                </div>
                <div className="md:col-span-3">
                  <Label className="block text-sm font-semibold mb-2">Precio (€)</Label>
                  <NumberInput
                    value={nuevaLinea.precioUnitario}
                    onChange={(value) => {
                      if (value != null) {
                        setNuevaLinea({ ...nuevaLinea, precioUnitario: value })
                      }
                    }}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    className="text-right w-full"
                  />
                </div>
                <div className="md:col-span-3">
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
                <div className="md:col-span-3">
                  <Label className="block text-sm font-semibold mb-2">Total</Label>
                  <div className="py-2 px-3 bg-white border border-green-200 rounded-lg font-bold text-right text-green-700 whitespace-nowrap">
                    {(() => {
                      const cant = nuevaLinea.cantidad || 0
                      const precio = nuevaLinea.precioUnitario || 0
                      const base = cant * precio
                      return base.toFixed(2)
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

      {/* MODAL CREAR CLIENTE - Completo con todos los campos */}
      {mostrarCrearCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
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
              {/* NOMBRE Y APELLIDOS - Grid horizontal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold">Nombre *</Label>
                  <Input
                    placeholder="Juan"
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Apellidos</Label>
                  <Input
                    placeholder="García López"
                    value={nuevoCliente.apellidos}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellidos: e.target.value })}
                  />
                </div>
              </div>

              {/* NIF Y TELÉFONO - Grid horizontal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold">NIF/CIF *</Label>
                  <Input
                    placeholder="12345678A"
                    value={nuevoCliente.nif}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nif: e.target.value.toUpperCase() })}
                    className={!nuevoCliente.nif ? '' : 'border-green-500'}
                  />
                  <p className="text-xs text-gray-500 mt-1">Obligatorio para factura legal</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Teléfono</Label>
                  <Input
                    placeholder="+34 600 000 000"
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <Label className="text-sm font-semibold">Email</Label>
                <Input
                  type="email"
                  placeholder="cliente@email.com"
                  value={nuevoCliente.email}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                />
              </div>

              {/* DIRECCIÓN */}
              <div>
                <Label className="text-sm font-semibold">Dirección</Label>
                <Input
                  placeholder="C/ Ejemplo, 123"
                  value={nuevoCliente.direccion}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
                />
              </div>

              {/* CIUDAD, PROVINCIA, CP - Grid horizontal */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm font-semibold">C.P.</Label>
                  <Input
                    placeholder="46001"
                    value={nuevoCliente.codigo_postal}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, codigo_postal: e.target.value })}
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Ciudad</Label>
                  <Input
                    placeholder="Valencia"
                    value={nuevoCliente.ciudad}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, ciudad: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Provincia</Label>
                  <Input
                    placeholder="Madrid"
                    value={nuevoCliente.provincia}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, provincia: e.target.value })}
                  />
                </div>
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
                  disabled={creandoCliente || !nuevoCliente.nombre || !nuevoCliente.nif}
                >
                  {creandoCliente ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Crear Cliente
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
