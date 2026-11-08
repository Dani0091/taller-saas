/**
 * @fileoverview Componente para visualizar y generar PDF de orden de trabajo
 * @description Modal que muestra vista previa del PDF de orden de trabajo
 * con opción de imprimir o compartir por WhatsApp
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Printer, Share2, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface OrdenPDFViewerProps {
  ordenId: string
  onClose: () => void
}

interface DatosOrden {
  taller: {
    nombre: string
    cif: string
    direccion: string
    telefono: string
    email: string
    logoUrl: string | null
  }
  orden: {
    numero: string
    estado: string
    fechaEntrada: string
    fechaSalidaEstimada: string | null
    descripcionProblema: string | null
    diagnostico: string | null
    trabajosRealizados: string | null
    tiempoEstimado: number | null
    tiempoReal: number | null
  }
  cliente: {
    nombre: string
    apellidos: string
    nif: string
    direccion: string
    ciudad: string
    codigoPostal: string
    telefono: string
    email: string
  }
  vehiculo: {
    marca: string
    modelo: string
    matricula: string
    año: number | null
    color: string
    kilometros: number | null
    tipoCombustible: string
    vin: string
  }
  legal: {
    nivelCombustible: string
    renunciaPresupuesto: boolean
    accionImprevisto: string
    recogerPiezas: boolean
    danosCarroceria: string
    costeDiarioEstancia: number | null
    kilometrosEntrada: number | null
    presupuestoAprobado: boolean
  }
  lineas: {
    tipo: string
    descripcion: string
    cantidad: number
    horas: number | null
    precioUnitario: number
    total: number
  }[]
  totales: {
    subtotalManoObra: number
    subtotalPiezas: number
    iva: number
    total: number
  }
}

export function OrdenPDFViewer({ ordenId, onClose }: OrdenPDFViewerProps) {
  const [cargando, setCargando] = useState(true)
  const [datos, setDatos] = useState<DatosOrden | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cargarDatos()
  }, [ordenId])

  const cargarDatos = async () => {
    try {
      const res = await fetch(`/api/ordenes/generar-pdf?id=${ordenId}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Error al cargar datos')
      }

      setDatos(json.datos)
    } catch (error: any) {
      toast.error(error.message)
      onClose()
    } finally {
      setCargando(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleWhatsApp = () => {
    if (!datos) return

    const texto = encodeURIComponent(
      `📋 ORDEN DE TRABAJO ${datos.orden.numero}\n\n` +
      `🏢 ${datos.taller.nombre}\n` +
      `📞 ${datos.taller.telefono}\n\n` +
      `👤 Cliente: ${datos.cliente.nombre} ${datos.cliente.apellidos}\n` +
      `🚗 Vehículo: ${datos.vehiculo.marca} ${datos.vehiculo.modelo}\n` +
      `📝 Matrícula: ${datos.vehiculo.matricula}\n` +
      `⏱️ KM: ${datos.vehiculo.kilometros?.toLocaleString() || 'N/A'}\n\n` +
      `📌 Problema: ${datos.orden.descripcionProblema || 'Sin especificar'}\n\n` +
      `💰 Total estimado: ${formatCurrency(datos.totales.total)}\n\n` +
      `Estado: ${datos.orden.estado.toUpperCase()}`
    )

    window.open(`https://wa.me/?text=${texto}`, '_blank')
  }

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (cargando) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-sky-600" />
          <p className="text-gray-600">Generando orden de trabajo...</p>
        </div>
      </div>
    )
  }

  if (!datos) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header con acciones */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">
            Orden de Trabajo {datos.orden.numero}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleWhatsApp}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-2 bg-sky-600 hover:bg-sky-700"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido del PDF - Vista previa */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div
            ref={printRef}
            className="bg-white shadow-lg mx-auto max-w-[210mm] p-8 print:shadow-none print:p-4"
            style={{ minHeight: '297mm' }}
          >
            {/* Cabecera del taller */}
            <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
              <div className="flex items-center gap-4">
                {datos.taller.logoUrl ? (
                  <img
                    src={datos.taller.logoUrl}
                    alt="Logo"
                    className="h-16 w-auto object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                    🔧
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{datos.taller.nombre}</h1>
                  <p className="text-sm text-gray-600">{datos.taller.direccion}</p>
                  <p className="text-sm text-gray-600">
                    Tel: {datos.taller.telefono} • {datos.taller.email}
                  </p>
                  <p className="text-sm text-gray-600">CIF: {datos.taller.cif}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-sky-700">ORDEN DE TRABAJO</h2>
                <p className="text-xl font-mono font-bold">{datos.orden.numero}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Fecha: {formatFecha(datos.orden.fechaEntrada)}
                </p>
              </div>
            </div>

            {/* Datos Cliente y Vehículo */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Cliente */}
              <div className="border rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-2 border-b pb-1">
                  👤 DATOS DEL CLIENTE
                </h3>
                <div className="text-sm space-y-1">
                  <p><strong>Nombre:</strong> {datos.cliente.nombre} {datos.cliente.apellidos}</p>
                  <p><strong>NIF:</strong> {datos.cliente.nif}</p>
                  <p><strong>Dirección:</strong> {datos.cliente.direccion}</p>
                  <p><strong>Población:</strong> {datos.cliente.ciudad} {datos.cliente.codigoPostal}</p>
                  <p><strong>Teléfono:</strong> {datos.cliente.telefono}</p>
                  <p><strong>Email:</strong> {datos.cliente.email}</p>
                </div>
              </div>

              {/* Vehículo */}
              <div className="border rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-2 border-b pb-1">
                  🚗 DATOS DEL VEHÍCULO
                </h3>
                <div className="text-sm space-y-1">
                  <p><strong>Marca/Modelo:</strong> {datos.vehiculo.marca} {datos.vehiculo.modelo}</p>
                  <p><strong>Matrícula:</strong> <span className="font-mono font-bold">{datos.vehiculo.matricula}</span></p>
                  <p><strong>Año:</strong> {datos.vehiculo.año || '—'}</p>
                  <p><strong>Color:</strong> {datos.vehiculo.color || '—'}</p>
                  <p><strong>Kilómetros:</strong> {datos.vehiculo.kilometros?.toLocaleString() || '—'} km</p>
                  <p><strong>Combustible:</strong> {datos.vehiculo.tipoCombustible || '—'}</p>
                  <p><strong>VIN:</strong> <span className="font-mono text-xs">{datos.vehiculo.vin || '—'}</span></p>
                </div>
              </div>
            </div>

            {/* Recepción del vehículo */}
            <div className="border rounded-lg p-4 mb-6">
              <h3 className="font-bold text-gray-800 mb-3 border-b pb-1">
                ⛽ RECEPCIÓN DEL VEHÍCULO
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Nivel combustible:</strong>
                  <div className="flex gap-2 mt-1">
                    {['E', '1/4', '1/2', '3/4', 'F'].map(nivel => (
                      <span
                        key={nivel}
                        className={`px-2 py-1 rounded border text-xs ${
                          datos.legal.nivelCombustible === nivel
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {nivel}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <strong>KM entrada:</strong>
                  <p className="font-mono mt-1">
                    {datos.legal.kilometrosEntrada?.toLocaleString() || datos.vehiculo.kilometros?.toLocaleString() || '—'} km
                  </p>
                </div>
                <div>
                  <strong>Coste diario estancia:</strong>
                  <p className="mt-1">
                    {datos.legal.costeDiarioEstancia ? `${formatCurrency(datos.legal.costeDiarioEstancia)}/día` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Autorizaciones */}
            <div className="border rounded-lg p-4 mb-6">
              <h3 className="font-bold text-gray-800 mb-3 border-b pb-1">
                ✍️ AUTORIZACIONES DEL CLIENTE
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    datos.legal.presupuestoAprobado ? 'bg-green-500 border-green-500 text-white' : 'border-gray-400'
                  }`}>
                    {datos.legal.presupuestoAprobado && '✓'}
                  </span>
                  <span>Autoriza reparación</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    datos.legal.renunciaPresupuesto ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-400'
                  }`}>
                    {datos.legal.renunciaPresupuesto && '✓'}
                  </span>
                  <span>Renuncia a presupuesto previo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    datos.legal.recogerPiezas ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-400'
                  }`}>
                    {datos.legal.recogerPiezas && '✓'}
                  </span>
                  <span>Desea recoger piezas sustituidas</span>
                </div>
                <div>
                  <strong>En caso de imprevistos:</strong>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    datos.legal.accionImprevisto === 'avisar'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {datos.legal.accionImprevisto === 'avisar' ? '📞 Avisar' : '🔧 Actuar'}
                  </span>
                </div>
              </div>
            </div>

            {/* Daños preexistentes */}
            {datos.legal.danosCarroceria && (
              <div className="border rounded-lg p-4 mb-6">
                <h3 className="font-bold text-gray-800 mb-2 border-b pb-1">
                  ⚠️ DAÑOS PREEXISTENTES EN CARROCERÍA
                </h3>
                <p className="text-sm whitespace-pre-wrap">{datos.legal.danosCarroceria}</p>
              </div>
            )}

            {/* Descripción del trabajo */}
            <div className="border rounded-lg p-4 mb-6">
              <h3 className="font-bold text-gray-800 mb-2 border-b pb-1">
                📋 DESCRIPCIÓN DEL PROBLEMA / TRABAJOS A REALIZAR
              </h3>
              <p className="text-sm whitespace-pre-wrap">
                {datos.orden.descripcionProblema || 'Sin especificar'}
              </p>
            </div>

            {/* Diagnóstico */}
            {datos.orden.diagnostico && (
              <div className="border rounded-lg p-4 mb-6">
                <h3 className="font-bold text-gray-800 mb-2 border-b pb-1">
                  🔍 DIAGNÓSTICO
                </h3>
                <p className="text-sm whitespace-pre-wrap">{datos.orden.diagnostico}</p>
              </div>
            )}

            {/* Tabla de trabajos */}
            {datos.lineas.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-2">
                  🔧 MANO DE OBRA Y REPUESTOS
                </h3>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-2 py-1 text-left">Tipo</th>
                      <th className="border px-2 py-1 text-left">Descripción</th>
                      <th className="border px-2 py-1 text-center">Cant.</th>
                      <th className="border px-2 py-1 text-right">Precio</th>
                      <th className="border px-2 py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.lineas.map((linea, i) => (
                      <tr key={i}>
                        <td className="border px-2 py-1">
                          {linea.tipo === 'mano_obra' ? '🔧' : linea.tipo === 'pieza' ? '⚙️' : '🛠️'}
                        </td>
                        <td className="border px-2 py-1">{linea.descripcion}</td>
                        <td className="border px-2 py-1 text-center">{linea.cantidad}</td>
                        <td className="border px-2 py-1 text-right">{formatCurrency(linea.precioUnitario)}</td>
                        <td className="border px-2 py-1 text-right font-medium">{formatCurrency(linea.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totales */}
            <div className="flex justify-end mb-6">
              <div className="w-64 border rounded-lg overflow-hidden">
                <div className="flex justify-between px-4 py-2 bg-gray-50">
                  <span>Mano de obra:</span>
                  <span className="font-medium">{formatCurrency(datos.totales.subtotalManoObra)}</span>
                </div>
                <div className="flex justify-between px-4 py-2 border-t bg-gray-50">
                  <span>Repuestos:</span>
                  <span className="font-medium">{formatCurrency(datos.totales.subtotalPiezas)}</span>
                </div>
                <div className="flex justify-between px-4 py-2 border-t">
                  <span>
                    {datos.totales.iva === 0 && (datos.totales.subtotalManoObra + datos.totales.subtotalPiezas) > 0
                      ? 'IVA (sin aplicar):'
                      : 'IVA:'}
                  </span>
                  <span className="font-medium">{formatCurrency(datos.totales.iva)}</span>
                </div>
                <div className="flex justify-between px-4 py-3 border-t bg-sky-600 text-white">
                  <span className="font-bold">TOTAL:</span>
                  <span className="font-bold text-lg">{formatCurrency(datos.totales.total)}</span>
                </div>
              </div>
            </div>

            {/* Firma */}
            <div className="grid grid-cols-2 gap-8 mt-8 pt-4 border-t">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-12">Firma del cliente</p>
                <div className="border-t border-gray-400 mx-8"></div>
                <p className="text-xs text-gray-500 mt-1">
                  {datos.cliente.nombre} {datos.cliente.apellidos}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-12">Sello del taller</p>
                <div className="border-t border-gray-400 mx-8"></div>
                <p className="text-xs text-gray-500 mt-1">{datos.taller.nombre}</p>
              </div>
            </div>

            {/* Pie de página */}
            <div className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
              <p>Documento generado el {new Date().toLocaleDateString('es-ES')} a las {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="mt-1">Este documento tiene validez como resguardo de recepción del vehículo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  )
}
