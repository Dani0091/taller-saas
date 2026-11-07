'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileText, Plus, Download, Eye, Trash2, Loader2, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { listarFacturasAction, anularFacturaAction } from '@/actions/facturas'
import type { FacturaListadoDTO } from '@/application/dtos'
import { EstadoFactura } from '@/domain/types'
import { useDescargarFacturasMultiple } from '@/hooks/useDescargarFacturasMultiple'
import { isToday, isThisWeek, isThisMonth, isThisYear, isWithinInterval, subMonths, startOfDay, endOfDay } from 'date-fns'

const estadoColors: Record<string, string> = {
  'borrador': 'bg-gray-100 text-gray-800',
  'emitida': 'bg-blue-100 text-blue-800',
  'pagada': 'bg-green-100 text-green-800',
  'anulada': 'bg-red-100 text-red-800',
}

type FiltroFecha = 'todas' | 'hoy' | 'semana' | 'mes' | '3meses' | 'año' | 'personalizado'

const FILTROS_FECHA: { value: FiltroFecha; label: string }[] = [
  { value: 'todas', label: 'Sin filtro' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: '3meses', label: 'Últimos 3 meses' },
  { value: 'año', label: 'Este año' },
  { value: 'personalizado', label: 'Fecha personalizada' },
]

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<FacturaListadoDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<EstadoFactura | ''>('')
  const [busqueda, setBusqueda] = useState<string>('')
  const [sortBy, setSortBy] = useState<'recientes' | 'antiguos' | 'fecha_emision'>('recientes')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>('todas')
  const [rangoPersonalizado, setRangoPersonalizado] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())

  const { descargarSeleccionadas, descargando } = useDescargarFacturasMultiple()

  useEffect(() => {
    fetchFacturas()
  }, [filtroEstado, sortBy])

  const fetchFacturas = async () => {
    try {
      setLoading(true)
      setError(null)

      // Usar Server Action blindada en lugar de API route
      const resultado = await listarFacturasAction({
        estado: filtroEstado || undefined,
        sortBy,
        page: 1,
        pageSize: 100
      })

      if (!resultado.success) {
        throw new Error(resultado.error)
      }

      setFacturas(resultado.data.data)
    } catch (err: any) {
      console.error('Error cargando facturas:', err)
      setError(err.message || 'Error al cargar facturas')
      toast.error('Error al cargar facturas')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas anular esta factura?')) return

    setDeletingId(id)
    try {
      // Usar Server Action para anular (no eliminar)
      const resultado = await anularFacturaAction({
        facturaId: id,
        motivo: 'Anulada desde el listado de facturas'
      })

      if (!resultado.success) {
        throw new Error(resultado.error)
      }

      toast.success('Factura anulada correctamente')
      fetchFacturas()
    } catch (err: any) {
      console.error('Error anulando factura:', err)
      toast.error(err.message || 'Error al anular factura')
    } finally {
      setDeletingId(null)
    }
  }

  const cumpleFiltroFecha = (fechaStr: string): boolean => {
    if (filtroFecha === 'todas') return true
    const fecha = new Date(fechaStr)
    switch (filtroFecha) {
      case 'hoy': return isToday(fecha)
      case 'semana': return isThisWeek(fecha, { weekStartsOn: 1 })
      case 'mes': return isThisMonth(fecha)
      case '3meses': return isWithinInterval(fecha, { start: subMonths(new Date(), 3), end: new Date() })
      case 'año': return isThisYear(fecha)
      case 'personalizado':
        if (!rangoPersonalizado.from || !rangoPersonalizado.to) return true
        return isWithinInterval(fecha, {
          start: startOfDay(new Date(rangoPersonalizado.from)),
          end: endOfDay(new Date(rangoPersonalizado.to)),
        })
      default: return true
    }
  }

  const facturasFiltradas = useMemo(() => facturas.filter(f =>
    (f.numeroFactura || '').toLowerCase().includes(busqueda.toLowerCase()) &&
    cumpleFiltroFecha(f.fechaEmision)
  ), [facturas, busqueda, filtroFecha, rangoPersonalizado])

  const todasSeleccionadasEnVista = facturasFiltradas.length > 0 &&
    facturasFiltradas.every(f => seleccionadas.has(f.id))

  const toggleSeleccion = (id: string) => {
    setSeleccionadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSeleccionarTodas = () => {
    setSeleccionadas(prev => {
      const next = new Set(prev)
      if (todasSeleccionadasEnVista) {
        facturasFiltradas.forEach(f => next.delete(f.id))
      } else {
        facturasFiltradas.forEach(f => next.add(f.id))
      }
      return next
    })
  }

  const limpiarSeleccion = () => setSeleccionadas(new Set())

  const handleDescargarSeleccionadas = async () => {
    const facturasParaDescargar = facturas
      .filter(f => seleccionadas.has(f.id))
      .map(f => ({ id: f.id, numeroFactura: f.numeroFactura || f.id }))
    await descargarSeleccionadas(facturasParaDescargar)
  }

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Facturas</h1>
          <p className="text-gray-600 mt-1">Gestiona todas tus facturas</p>
        </div>
        <Link href="/dashboard/facturas/nueva">
          <Button className="gap-2 bg-sky-600 hover:bg-sky-700 w-full sm:w-auto">
            <Plus className="w-5 h-5" />
            Nueva Factura
          </Button>
        </Link>
      </div>

      {/* FILTROS */}
      <Card className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Buscar</label>
            <Input
              placeholder="Buscar por número..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoFactura | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="emitida">Emitida</option>
              <option value="pagada">Pagada</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Ordenar por</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recientes' | 'antiguos' | 'fecha_emision')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="recientes">Más recientes</option>
              <option value="antiguos">Más antiguos</option>
              <option value="fecha_emision">Por fecha emisión</option>
            </select>
          </div>
        </div>

        {/* FILTRO DE FECHA */}
        <div>
          <label className="block text-sm font-semibold mb-2">Periodo</label>
          <div className="flex flex-wrap gap-2">
            {FILTROS_FECHA.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFiltroFecha(f.value)}
                className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                  filtroFecha === f.value
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-sky-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {filtroFecha === 'personalizado' && (
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                <Input
                  type="date"
                  value={rangoPersonalizado.from}
                  onChange={(e) => setRangoPersonalizado(prev => ({ ...prev, from: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                <Input
                  type="date"
                  value={rangoPersonalizado.to}
                  onChange={(e) => setRangoPersonalizado(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* LISTADO */}
      {error ? (
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-2">Error al cargar datos</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <Button onClick={() => { setError(null); fetchFacturas(); }}>
            Reintentar
          </Button>
        </Card>
      ) : loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      ) : facturasFiltradas.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {facturas.length === 0 ? 'No hay facturas' : 'Sin resultados para este filtro'}
          </p>
        </Card>
      ) : (
        <>
          <p className="text-sm text-gray-500">{facturasFiltradas.length} factura{facturasFiltradas.length !== 1 ? 's' : ''} encontrada{facturasFiltradas.length !== 1 ? 's' : ''}</p>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={todasSeleccionadasEnVista}
                        onChange={toggleSeleccionarTodas}
                        className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                        aria-label="Seleccionar todas"
                      />
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700">Número</th>
                    <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700 hidden sm:table-cell">Fecha</th>
                    <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700 hidden md:table-cell w-[120px]">Matrícula</th>
                    <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                    <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                    <th className="px-4 md:px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturasFiltradas.map((factura) => (
                    <tr key={factura.id} className={`border-b hover:bg-gray-50 transition ${seleccionadas.has(factura.id) ? 'bg-sky-50' : ''}`}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={seleccionadas.has(factura.id)}
                          onChange={() => toggleSeleccion(factura.id)}
                          className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                          aria-label={`Seleccionar factura ${factura.numeroFactura}`}
                        />
                      </td>
                      <td className="px-4 md:px-6 py-4 font-semibold text-gray-900">{factura.numeroFactura || '—'}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-600 hidden sm:table-cell">
                        {new Date(factura.fechaEmision).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 md:px-6 py-4 hidden md:table-cell w-[120px]">
                        {factura.vehiculo?.matricula ? (
                          <span className="font-mono font-semibold text-sky-600 tracking-wider">
                            {factura.vehiculo.matricula}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 font-semibold text-gray-900">
                        {factura.totalFormateado}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <Badge className={estadoColors[factura.estado] || 'bg-gray-100'}>
                          {factura.estado}
                        </Badge>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex justify-center gap-1 md:gap-2">
                          <Link href={`/dashboard/facturas/ver?id=${factura.id}`}>
                            <Button variant="ghost" size="sm" className="text-sky-600 p-2">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          {factura.estado === 'emitida' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(factura.id)}
                              disabled={deletingId === factura.id}
                              className="text-red-600 p-2"
                            >
                              {deletingId === factura.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* BARRA STICKY DE DESCARGA */}
      {seleccionadas.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-sky-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-white font-medium text-sm sm:text-base">
              {seleccionadas.size} factura{seleccionadas.size !== 1 ? 's' : ''} seleccionada{seleccionadas.size !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="xl"
                onClick={limpiarSeleccion}
                className="bg-transparent border-white text-white hover:bg-sky-700 hover:text-white gap-1"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Limpiar selección</span>
              </Button>
              <Button
                size="xl"
                onClick={handleDescargarSeleccionadas}
                disabled={descargando}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                {descargando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {descargando ? 'Descargando...' : `Descargar (${seleccionadas.size})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
