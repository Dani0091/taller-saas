'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, Menu, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DetalleOrdenSheet } from '@/components/dashboard/ordenes/detalle-orden-sheet'
import { toast } from 'sonner'
import { listarOrdenesAction } from '@/actions/ordenes'
import type { OrdenListItemDTO } from '@/application/dtos/orden.dto'

const ESTADO_CONFIG = {
  recibido: { label: 'Recibido', color: 'bg-blue-100 text-blue-800', icon: '📋', badge: 'bg-blue-500' },
  diagnostico: { label: 'Diagnóstico', color: 'bg-purple-100 text-purple-800', icon: '🔍', badge: 'bg-purple-500' },
  presupuestado: { label: 'Presupuestado', color: 'bg-yellow-100 text-yellow-800', icon: '💰', badge: 'bg-yellow-500' },
  aprobado: { label: 'Aprobado', color: 'bg-cyan-100 text-cyan-800', icon: '✓', badge: 'bg-cyan-500' },
  en_reparacion: { label: 'En Reparación', color: 'bg-amber-100 text-amber-800', icon: '🔧', badge: 'bg-amber-500' },
  completado: { label: 'Completado', color: 'bg-green-100 text-green-800', icon: '✅', badge: 'bg-green-500' },
  entregado: { label: 'Entregado', color: 'bg-emerald-100 text-emerald-800', icon: '🚗', badge: 'bg-emerald-600' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: '❌', badge: 'bg-red-500' }
} as Record<string, any>

const FILTROS = ['todos', 'recibido', 'diagnostico', 'presupuestado', 'aprobado', 'en_reparacion', 'completado', 'entregado', 'cancelado']

export default function OrdenesPage() {
  const [ordenes, setOrdenes] = useState<OrdenListItemDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroActivo, setFiltroActivo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [mostrarMenu, setMostrarMenu] = useState(false)
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<string | null>(null)
  const [modoCrear, setModoCrear] = useState(false)

  useEffect(() => {
    cargarOrdenes()
  }, [])

  const cargarOrdenes = async () => {
    try {
      setLoading(true)
      setError(null)

      // Usar Server Action blindada en lugar de Supabase directo
      const resultado = await listarOrdenesAction({
        page: 1,
        pageSize: 100
      })

      if (!resultado.success) {
        throw new Error(resultado.error)
      }

      setOrdenes(resultado.data.data)
    } catch (err: any) {
      console.error('Error cargando órdenes:', err)
      setError(err.message || 'Error al cargar órdenes')
      toast.error('Error al cargar órdenes')
    } finally {
      setLoading(false)
    }
  }

  const ordenesFiltradas = ordenes.filter(orden => {
    const pasaFiltro = filtroActivo === 'todos' || orden.estado === filtroActivo
    const searchLower = busqueda.toLowerCase()

    const pasaBusqueda =
      (orden.numeroOrden || '').toLowerCase().includes(searchLower) ||
      searchLower === ''

    return pasaFiltro && pasaBusqueda
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-8">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Órdenes</h1>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-2 bg-sky-600 hover:bg-sky-700"
              onClick={() => setModoCrear(true)}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMostrarMenu(!mostrarMenu)}
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* BÚSQUEDA */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar orden, cliente, matrícula..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* MENÚ/FILTROS */}
        {mostrarMenu && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Filtrar por estado:</p>
            <div className="flex flex-wrap gap-2">
              {FILTROS.map(filtro => (
                <button
                  key={filtro}
                  onClick={() => {
                    setFiltroActivo(filtro)
                    setMostrarMenu(false)
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    filtroActivo === filtro
                      ? 'bg-sky-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  {filtro === 'todos' ? 'Todas' : (ESTADO_CONFIG[filtro]?.label || filtro)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CONTENIDO */}
      <div className="px-4 py-4 space-y-3">
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-red-600 font-medium mb-2">Error al cargar datos</p>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <Button onClick={() => { setError(null); cargarOrdenes(); }}>
              Reintentar
            </Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          </div>
        ) : ordenesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium">Sin órdenes</p>
            <Button
              className="mt-4 gap-2"
              onClick={() => setModoCrear(true)}
            >
              <Plus className="w-4 h-4" />
              Crear primera orden
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {ordenesFiltradas.map(orden => {
              const config = ESTADO_CONFIG[orden.estado] || ESTADO_CONFIG.recibido
              return (
                <Card
                  key={orden.id}
                  onClick={() => setOrdenSeleccionada(orden.id)}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 active:bg-gray-100"
                  style={{borderLeftColor: config.badge}}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900">{orden.numeroOrden || '—'}</div>
                      <div className="text-sm text-gray-600">Cliente: {orden.clienteId}</div>
                    </div>
                    <Badge className={config.color}>{config.icon}</Badge>
                  </div>

                  <div className="text-sm text-gray-700 mb-3">
                    Vehículo: {orden.vehiculoId}
                  </div>

                  {/* STATS ROW */}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                    {orden.total > 0 && (
                      <div className="font-semibold text-green-600">{orden.totalFormateado}</div>
                    )}
                    <div className="text-gray-500">{orden.cantidadLineas} líneas</div>
                    {orden.isFacturada && (
                      <div className="text-blue-600">✓ Facturada</div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Resumen */}
      {!loading && ordenesFiltradas.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">
            {ordenesFiltradas.length} orden{ordenesFiltradas.length !== 1 ? 'es' : ''}
            {filtroActivo !== 'todos' && ` (${ESTADO_CONFIG[filtroActivo]?.label || filtroActivo})`}
          </div>
        </div>
      )}

      {/* SHEET DE DETALLES O CREAR */}
      {(ordenSeleccionada || modoCrear) && (
        <DetalleOrdenSheet
          ordenSeleccionada={ordenSeleccionada}
          ordenes={ordenesFiltradas}
          onClose={() => {
            setOrdenSeleccionada(null)
            setModoCrear(false)
          }}
          onActualizar={cargarOrdenes}
          modoCrear={modoCrear}
        />
      )}
    </div>
  )
}
