'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, Plus, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Cliente {
  id: string
  nombre: string
  nif: string
}

interface LineaFactura {
  id: string
  descripcion: string
  cantidad: number
  precioUnitario: number
}

export default function NuevaFacturaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cargandoClientes, setCargandoClientes] = useState(true)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [lineas, setLineas] = useState<LineaFactura[]>([])
  const [tallerId, setTallerId] = useState<string | null>(null)

  // Datos de la factura
  const [formData, setFormData] = useState({
    cliente_id: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    metodo_pago: 'T',
    notas: '',
    condiciones_pago: 'Pago a la vista',
  })

  // Nueva línea
  const [nuevaLinea, setNuevaLinea] = useState({
    descripcion: '',
    cantidad: '1',
    precioUnitario: '',
  })

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

  // Cargar clientes cuando tengamos taller_id
  useEffect(() => {
    if (tallerId) {
      fetchClientes()
    }
  }, [tallerId])

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
        if (data.length === 0) {
          toast.info('No hay clientes registrados. Crea uno primero.')
        }
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error)
      toast.error('Error al cargar clientes')
    } finally {
      setCargandoClientes(false)
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
    }

    setLineas([...lineas, linea])
    setNuevaLinea({
      descripcion: '',
      cantidad: '1',
      precioUnitario: '',
    })
    toast.success('Línea agregada')
  }

  const handleEliminarLinea = (id: string) => {
    setLineas(lineas.filter((l) => l.id !== id))
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
      // Calcular totales
      const baseImponible = lineas.reduce(
        (sum, l) => sum + l.cantidad * l.precioUnitario,
        0
      )
      const iva = baseImponible * 0.21
      const total = baseImponible + iva

      // Crear factura
      const response = await fetch('/api/facturas/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taller_id: tallerId,
          cliente_id: formData.cliente_id,
          fecha_emision: formData.fecha_emision,
          fecha_vencimiento: formData.fecha_vencimiento,
          base_imponible: baseImponible,
          iva,
          total,
          metodo_pago: formData.metodo_pago,
          notas_internas: formData.notas,
          condiciones_pago: formData.condiciones_pago,
          estado: 'borrador',
          lineas,
        }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success('Factura creada correctamente')
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
  const iva = baseImponible * 0.21
  const total = baseImponible + iva

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
            <p className="text-gray-600">Crear una nueva factura para cliente</p>
          </div>
        </div>

        {/* FORMULARIO */}
        <div className="space-y-6">
          {/* DATOS BÁSICOS */}
          <Card className="p-6 border-l-4 border-l-blue-600">
            <h2 className="font-bold text-lg mb-4 text-gray-900">Datos de la Factura</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cliente" className="block text-sm font-semibold mb-2">
                  Cliente *
                </Label>
                {cargandoClientes ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-600">Cargando clientes...</span>
                  </div>
                ) : (
                  <select
                    id="cliente"
                    value={formData.cliente_id}
                    onChange={(e) =>
                      setFormData({ ...formData, cliente_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecciona cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.nif})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <Label htmlFor="metodo" className="block text-sm font-semibold mb-2">
                  Método de Pago
                </Label>
                <select
                  id="metodo"
                  value={formData.metodo_pago}
                  onChange={(e) =>
                    setFormData({ ...formData, metodo_pago: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="T">Transferencia Bancaria</option>
                  <option value="E">Efectivo</option>
                  <option value="A">Tarjeta</option>
                  <option value="O">Otro</option>
                </select>
              </div>

              <div>
                <Label htmlFor="emision" className="block text-sm font-semibold mb-2">
                  Fecha de Emisión
                </Label>
                <Input
                  id="emision"
                  type="date"
                  value={formData.fecha_emision}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_emision: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="vencimiento" className="block text-sm font-semibold mb-2">
                  Fecha de Vencimiento
                </Label>
                <Input
                  id="vencimiento"
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_vencimiento: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="condiciones" className="block text-sm font-semibold mb-2">
                Condiciones de Pago
              </Label>
              <Input
                id="condiciones"
                placeholder="Ej: Pago a 30 días desde la emisión"
                value={formData.condiciones_pago}
                onChange={(e) =>
                  setFormData({ ...formData, condiciones_pago: e.target.value })
                }
              />
            </div>

            <div className="mt-4">
              <Label htmlFor="notas" className="block text-sm font-semibold mb-2">
                Notas Internas
              </Label>
              <Textarea
                id="notas"
                placeholder="Notas que no aparecerán en la factura"
                value={formData.notas}
                onChange={(e) =>
                  setFormData({ ...formData, notas: e.target.value })
                }
                rows={2}
              />
            </div>
          </Card>

          {/* LÍNEAS */}
          <Card className="p-6 border-l-4 border-l-green-600">
            <h2 className="font-bold text-lg mb-4 text-gray-900">Conceptos de Reparación</h2>

            {lineas.length > 0 && (
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead className="border-b-2 border-green-600 bg-green-50">
                    <tr>
                      <th className="text-left py-3 px-2 font-bold">Descripción</th>
                      <th className="text-center py-3 px-2 font-bold">Cantidad</th>
                      <th className="text-right py-3 px-2 font-bold">Precio</th>
                      <th className="text-right py-3 px-2 font-bold">Total</th>
                      <th className="text-center py-3 px-2 font-bold">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((linea) => (
                      <tr key={linea.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">{linea.descripcion}</td>
                        <td className="text-center py-3 px-2">{linea.cantidad}</td>
                        <td className="text-right py-3 px-2">€{linea.precioUnitario.toFixed(2)}</td>
                        <td className="text-right py-3 px-2 font-semibold">
                          €{(linea.cantidad * linea.precioUnitario).toFixed(2)}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* AGREGAR LÍNEA */}
            <div className="space-y-3 p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div>
                <Label htmlFor="descripcion" className="block text-sm font-semibold mb-2">
                  Descripción
                </Label>
                <Input
                  id="descripcion"
                  placeholder="Ej: Cambio de aceite y filtro"
                  value={nuevaLinea.descripcion}
                  onChange={(e) =>
                    setNuevaLinea({ ...nuevaLinea, descripcion: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="cantidad" className="block text-sm font-semibold mb-2">
                    Cantidad (Uds/Horas)
                  </Label>
                  <Input
                    id="cantidad"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="1"
                    value={nuevaLinea.cantidad}
                    onChange={(e) =>
                      setNuevaLinea({ ...nuevaLinea, cantidad: e.target.value })
                    }
                    className="text-center font-medium"
                  />
                </div>
                <div>
                  <Label htmlFor="precio" className="block text-sm font-semibold mb-2">
                    Precio Unitario (€)
                  </Label>
                  <Input
                    id="precio"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={nuevaLinea.precioUnitario}
                    onChange={(e) =>
                      setNuevaLinea({
                        ...nuevaLinea,
                        precioUnitario: e.target.value,
                      })
                    }
                    className="text-right font-medium"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-semibold mb-2">
                    Total Línea
                  </Label>
                  <div className="py-2 px-3 bg-green-50 border border-green-200 rounded-lg font-bold text-right text-green-700">
                    €{(
                      parseFloat(nuevaLinea.cantidad || '0') *
                      parseFloat(nuevaLinea.precioUnitario || '0')
                    ).toFixed(2)}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAgregarLinea}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Agregar Línea
              </Button>
            </div>
          </Card>

          {/* RESUMEN */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-600">
            <h2 className="font-bold text-lg mb-4 text-gray-900">Resumen de Totales</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Imponible:</span>
                <span className="font-semibold">€{baseImponible.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA (21%):</span>
                <span className="font-semibold">€{iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg border-t-2 border-blue-200 pt-2 mt-2">
                <span className="font-bold text-gray-900">Total a Pagar:</span>
                <span className="font-bold text-blue-600 text-xl">€{total.toFixed(2)}</span>
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
              disabled={loading || lineas.length === 0 || cargandoClientes}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Crear Factura
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
