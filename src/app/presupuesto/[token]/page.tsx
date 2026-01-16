/**
 * @fileoverview Página pública de presupuesto
 * @description Permite al cliente ver y aceptar el presupuesto sin autenticación
 */
'use client'

import { useState, useEffect, use } from 'react'
import { Check, Loader2, Download, Share2, Printer, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Presupuesto {
  numero: string
  fechaEmision: string
  fechaAceptacion: string | null
  aceptado: boolean
  taller: {
    nombre: string
    direccion: string
    telefono: string
    email: string
    logoUrl: string | null
    colorPrimario: string
  }
  cliente: {
    nombre: string
    apellidos: string
  }
  vehiculo: {
    marca: string
    modelo: string
    matricula: string
    año: number | null
    color: string
    kilometros: number | null
  }
  descripcion: string
  lineas: {
    tipo: string
    descripcion: string
    cantidad: number
    precio: number
    total: number
  }[]
  totales: {
    manoObra: number
    piezas: number
    iva: number
    total: number
  }
}

export default function PresupuestoPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [aceptando, setAceptando] = useState(false)
  const [aceptado, setAceptado] = useState(false)

  useEffect(() => {
    cargarPresupuesto()
  }, [token])

  const cargarPresupuesto = async () => {
    try {
      const res = await fetch(`/api/presupuesto/${token}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar presupuesto')
      }

      setPresupuesto(data.presupuesto)
      setAceptado(data.presupuesto.aceptado)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const handleAceptar = async () => {
    if (!presupuesto || aceptado) return

    setAceptando(true)
    try {
      const res = await fetch(`/api/presupuesto/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al aceptar')
      }

      setAceptado(true)
      setPresupuesto(prev => prev ? {
        ...prev,
        aceptado: true,
        fechaAceptacion: data.fechaAceptacion,
      } : null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAceptando(false)
    }
  }

  const handleImprimir = () => {
    window.print()
  }

  const handleCompartir = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Presupuesto ${presupuesto?.numero}`,
          text: `Presupuesto de ${presupuesto?.taller.nombre}`,
          url,
        })
      } catch (err) {
        // Usuario canceló
      }
    } else {
      await navigator.clipboard.writeText(url)
      alert('Enlace copiado al portapapeles')
    }
  }

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-sky-600 mb-4" />
          <p className="text-gray-600">Cargando presupuesto...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Presupuesto no disponible
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!presupuesto) return null

  const colorPrimario = presupuesto.taller.colorPrimario || '#0ea5e9'

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 print:bg-white print:py-0">
      {/* Contenedor principal */}
      <div className="max-w-3xl mx-auto">
        {/* Barra de acciones (oculta en impresión) */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <h1 className="text-lg font-bold text-gray-900">
            Presupuesto {presupuesto.numero}
          </h1>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCompartir}
              className="gap-1"
            >
              <Share2 className="w-4 h-4" />
              Compartir
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleImprimir}
              className="gap-1"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Documento */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none print:rounded-none">
          {/* Cabecera con color del taller */}
          <div
            className="p-4 sm:p-6 text-white"
            style={{ backgroundColor: colorPrimario }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                {presupuesto.taller.logoUrl ? (
                  <img
                    src={presupuesto.taller.logoUrl}
                    alt="Logo"
                    className="h-12 sm:h-14 w-auto object-contain bg-white rounded-lg p-1"
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-lg flex items-center justify-center text-2xl sm:text-3xl">
                    🔧
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-bold truncate">{presupuesto.taller.nombre}</h2>
                  <p className="text-xs sm:text-sm opacity-90 truncate">{presupuesto.taller.direccion}</p>
                  <p className="text-xs sm:text-sm opacity-90 truncate">
                    {presupuesto.taller.telefono} • {presupuesto.taller.email}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right flex-shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0 border-white/20">
                <p className="text-xs opacity-75">PRESUPUESTO</p>
                <p className="text-xl sm:text-2xl font-bold font-mono">{presupuesto.numero}</p>
                <p className="text-xs sm:text-sm opacity-90 mt-1">
                  {formatFecha(presupuesto.fechaEmision)}
                </p>
              </div>
            </div>
          </div>

          {/* Estado de aceptación */}
          {aceptado && (
            <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Presupuesto aceptado</p>
                <p className="text-sm text-green-600">
                  {formatFecha(presupuesto.fechaAceptacion)}
                </p>
              </div>
            </div>
          )}

          {/* Contenido */}
          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {/* Cliente y Vehículo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Cliente
                </h3>
                <p className="font-medium text-gray-900">
                  {presupuesto.cliente.nombre} {presupuesto.cliente.apellidos}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Vehículo
                </h3>
                <p className="font-medium text-gray-900">
                  {presupuesto.vehiculo.marca} {presupuesto.vehiculo.modelo}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-mono font-bold">{presupuesto.vehiculo.matricula}</span>
                  {presupuesto.vehiculo.año && ` • ${presupuesto.vehiculo.año}`}
                  {presupuesto.vehiculo.kilometros && ` • ${presupuesto.vehiculo.kilometros.toLocaleString()} km`}
                </p>
              </div>
            </div>

            {/* Descripción del trabajo */}
            {presupuesto.descripcion && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Descripción del trabajo
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {presupuesto.descripcion}
                </p>
              </div>
            )}

            {/* Tabla de líneas */}
            {presupuesto.lineas.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  Detalle del presupuesto
                </h3>
                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm min-w-[320px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 text-left font-medium text-gray-600">Concepto</th>
                        <th className="px-2 sm:px-4 py-2 text-center font-medium text-gray-600 w-16">Cant.</th>
                        <th className="px-2 sm:px-4 py-2 text-right font-medium text-gray-600 w-20">Precio</th>
                        <th className="px-3 sm:px-4 py-2 text-right font-medium text-gray-600 w-20">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {presupuesto.lineas.map((linea, i) => (
                        <tr key={i}>
                          <td className="px-3 sm:px-4 py-3">
                            <span className="mr-1 sm:mr-2">
                              {linea.tipo === 'mano_obra' ? '🔧' : linea.tipo === 'pieza' ? '⚙️' : '🛠️'}
                            </span>
                            <span className="break-words">{linea.descripcion}</span>
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center">{linea.cantidad}</td>
                          <td className="px-2 sm:px-4 py-3 text-right whitespace-nowrap">€{linea.precio.toFixed(2)}</td>
                          <td className="px-3 sm:px-4 py-3 text-right font-medium whitespace-nowrap">€{linea.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totales */}
            <div className="flex justify-center sm:justify-end">
              <div className="w-full sm:w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Mano de obra:</span>
                  <span>€{presupuesto.totales.manoObra.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Repuestos:</span>
                  <span>€{presupuesto.totales.piezas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-gray-600">IVA (21%):</span>
                  <span>€{presupuesto.totales.iva.toFixed(2)}</span>
                </div>
                <div
                  className="flex justify-between text-lg font-bold p-3 rounded-lg text-white"
                  style={{ backgroundColor: colorPrimario }}
                >
                  <span>TOTAL:</span>
                  <span>€{presupuesto.totales.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Botón de aceptar (oculto si ya aceptado o en impresión) */}
            {!aceptado && (
              <div className="border-t pt-6 mt-6 print:hidden">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-amber-800">
                    <strong>Aviso:</strong> Al aceptar este presupuesto, autorizas al taller
                    a realizar los trabajos descritos. Se registrará la fecha, hora e IP
                    de tu aceptación como prueba de conformidad.
                  </p>
                </div>
                <Button
                  onClick={handleAceptar}
                  disabled={aceptando}
                  className="w-full py-4 text-lg gap-2"
                  style={{ backgroundColor: colorPrimario }}
                >
                  {aceptando ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  {aceptando ? 'Aceptando...' : 'Aceptar Presupuesto'}
                </Button>
              </div>
            )}

            {/* Pie de página */}
            <div className="text-center text-xs text-gray-400 pt-4 border-t">
              <p>Este presupuesto tiene una validez de 30 días desde su emisión.</p>
              <p className="mt-1">Los precios incluyen IVA. Tiempo de reparación estimado sujeto a disponibilidad de piezas.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  )
}
