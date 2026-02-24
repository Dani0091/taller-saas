'use client'

/**
 * PÁGINA STANDALONE: Generador de Facturas
 *
 * Características:
 * - Formulario completo autocontenido
 * - Selección de serie
 * - Configuración de cliente
 * - Añadir líneas dinámicamente
 * - Preview en tiempo real
 * - Generación de PDF
 * - Guardado en Supabase
 * - Numeración automática correlativa
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Types
interface LineaFactura {
  id: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuento: number
  iva: number
}

interface DatosFactura {
  serie: string
  clienteNombre: string
  clienteNIF: string
  clienteDireccion: string
  clienteEmail: string
  fechaEmision: string
  fechaVencimiento: string
  lineas: LineaFactura[]
  notas: string
}

const SERIES_DISPONIBLES = [
  { value: 'F', label: 'F - Facturas Ordinarias', color: 'blue' },
  { value: 'P', label: 'P - Proformas', color: 'purple' },
  { value: 'R', label: 'R - Rectificativas', color: 'red' },
  { value: 'S', label: 'S - Simplificadas', color: 'green' },
]

export default function GeneradorFacturasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState(false)

  const [datos, setDatos] = useState<DatosFactura>({
    serie: 'F',
    clienteNombre: '',
    clienteNIF: '',
    clienteDireccion: '',
    clienteEmail: '',
    fechaEmision: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    lineas: [],
    notas: '',
  })

  // Calcular totales
  const calcularTotales = () => {
    let subtotal = 0
    let totalIVA = 0

    datos.lineas.forEach(linea => {
      const base = linea.cantidad * linea.precioUnitario * (1 - linea.descuento / 100)
      subtotal += base
      totalIVA += base * (linea.iva / 100)
    })

    return {
      subtotal: subtotal.toFixed(2),
      iva: totalIVA.toFixed(2),
      total: (subtotal + totalIVA).toFixed(2),
    }
  }

  const totales = calcularTotales()

  // Añadir línea
  const añadirLinea = () => {
    setDatos({
      ...datos,
      lineas: [
        ...datos.lineas,
        {
          id: crypto.randomUUID(),
          descripcion: '',
          cantidad: 1,
          precioUnitario: 0,
          descuento: 0,
          iva: 21,
        },
      ],
    })
  }

  // Eliminar línea
  const eliminarLinea = (id: string) => {
    setDatos({
      ...datos,
      lineas: datos.lineas.filter(l => l.id !== id),
    })
  }

  // Actualizar línea
  const actualizarLinea = (id: string, campo: keyof LineaFactura, valor: any) => {
    setDatos({
      ...datos,
      lineas: datos.lineas.map(l =>
        l.id === id ? { ...l, [campo]: valor } : l
      ),
    })
  }

  // Emitir factura
  const emitirFactura = async () => {
    if (!datos.clienteNombre || !datos.clienteNIF) {
      toast.error('Por favor completa los datos del cliente')
      return
    }

    if (datos.lineas.length === 0) {
      toast.error('Añade al menos una línea a la factura')
      return
    }

    setLoading(true)

    try {
      // 1. Crear borrador de factura
      const response = await fetch('/api/facturas/generar-standalone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear factura')
      }

      const { facturaId, numeroFactura } = await response.json()

      toast.success(`Factura ${numeroFactura} creada correctamente`)

      // 2. Generar PDF
      await generarPDF(facturaId)

      // 3. Redirigir a la factura
      router.push(`/dashboard/facturas/${facturaId}`)

    } catch (error: any) {
      console.error('Error emitiendo factura:', error)
      toast.error(error.message || 'Error al emitir factura')
    } finally {
      setLoading(false)
    }
  }

  // Generar PDF
  const generarPDF = async (facturaId: string) => {
    setGenerandoPDF(true)

    try {
      const response = await fetch(`/api/facturas/${facturaId}/pdf`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Error al generar PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')

      toast.success('PDF generado correctamente')
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar PDF')
    } finally {
      setGenerandoPDF(false)
    }
  }

  // Añadir línea inicial al cargar
  useEffect(() => {
    if (datos.lineas.length === 0) {
      añadirLinea()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Generador de Facturas</h1>
          <p className="text-gray-600 mt-2">Crea y personaliza tus facturas de forma rápida</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="lg:col-span-2 space-y-6">
            {/* Serie */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Serie de Factura</h2>
              <select
                value={datos.serie}
                onChange={(e) => setDatos({ ...datos, serie: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                {SERIES_DISPONIBLES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Datos del Cliente */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Datos del Cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Nombre / Razón Social *</label>
                  <input
                    type="text"
                    value={datos.clienteNombre}
                    onChange={(e) => setDatos({ ...datos, clienteNombre: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">NIF/CIF *</label>
                  <input
                    type="text"
                    value={datos.clienteNIF}
                    onChange={(e) => setDatos({ ...datos, clienteNIF: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="12345678A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={datos.clienteEmail}
                    onChange={(e) => setDatos({ ...datos, clienteEmail: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="cliente@email.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Dirección</label>
                  <input
                    type="text"
                    value={datos.clienteDireccion}
                    onChange={(e) => setDatos({ ...datos, clienteDireccion: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Calle Principal, 123"
                  />
                </div>
              </div>
            </div>

            {/* Fechas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Fechas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Emisión</label>
                  <input
                    type="date"
                    value={datos.fechaEmision}
                    onChange={(e) => setDatos({ ...datos, fechaEmision: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={datos.fechaVencimiento}
                    onChange={(e) => setDatos({ ...datos, fechaVencimiento: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Líneas de Factura */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Líneas de Factura</h2>
                <button
                  onClick={añadirLinea}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  + Añadir Línea
                </button>
              </div>

              <div className="space-y-4">
                {datos.lineas.map(linea => (
                  <div key={linea.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-12 gap-3 items-start">
                      <div className="col-span-12 md:col-span-5">
                        <label className="block text-xs font-medium mb-1">Descripción</label>
                        <input
                          type="text"
                          value={linea.descripcion}
                          onChange={(e) => actualizarLinea(linea.id, 'descripcion', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                          placeholder="Descripción del producto/servicio"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <label className="block text-xs font-medium mb-1">Cantidad</label>
                        <input
                          type="number"
                          value={linea.cantidad}
                          onChange={(e) => actualizarLinea(linea.id, 'cantidad', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <label className="block text-xs font-medium mb-1">Precio €</label>
                        <input
                          type="number"
                          value={linea.precioUnitario}
                          onChange={(e) => actualizarLinea(linea.id, 'precioUnitario', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-1">
                        <label className="block text-xs font-medium mb-1">Dto %</label>
                        <input
                          type="number"
                          value={linea.descuento}
                          onChange={(e) => actualizarLinea(linea.id, 'descuento', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-medium mb-1">IVA %</label>
                        <select
                          value={linea.iva}
                          onChange={(e) => actualizarLinea(linea.id, 'iva', parseFloat(e.target.value))}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        >
                          <option value="0">0%</option>
                          <option value="4">4%</option>
                          <option value="10">10%</option>
                          <option value="21">21%</option>
                        </select>
                      </div>
                      <div className="col-span-1 flex items-end justify-center">
                        <button
                          onClick={() => eliminarLinea(linea.id)}
                          className="text-red-600 hover:text-red-800 p-1.5"
                          title="Eliminar línea"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Notas / Condiciones</h2>
              <textarea
                value={datos.notas}
                onChange={(e) => setDatos({ ...datos, notas: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 h-24"
                placeholder="Forma de pago, condiciones especiales, etc."
              />
            </div>
          </div>

          {/* Preview / Resumen */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-lg font-semibold mb-4">Resumen</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Serie:</span>
                  <span className="font-medium">{datos.serie}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Líneas:</span>
                  <span className="font-medium">{datos.lineas.length}</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{totales.subtotal} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA:</span>
                  <span>{totales.iva} €</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{totales.total} €</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={emitirFactura}
                  disabled={loading || generandoPDF}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                >
                  {loading ? 'Emitiendo...' : 'Emitir Factura'}
                </button>

                <button
                  onClick={() => router.push('/dashboard/facturas')}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>

              <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Numeración automática:</strong> Al emitir, se asignará el siguiente número correlativo de la serie seleccionada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
