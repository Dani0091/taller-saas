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

interface Orden {
  id: string
  numero_orden: string
  estado: string
  cliente_id: string
  clientes?: { nombre: string }
  vehiculo_id: string
  vehiculos?: { marca: string; modelo: string; matricula: string }
  descripcion_problema: string
  diagnostico?: string
  tiempo_estimado_horas?: number
  tiempo_real_horas?: number
  subtotal_mano_obra?: number
  subtotal_piezas?: number
  total_con_iva?: number
  iva_amount?: number
  fecha_entrada: string
  presupuesto_aprobado_por_cliente: boolean
}

const ESTADO_CONFIG = {
  recibido: { label: 'Recibido', color: 'bg-blue-100 text-blue-800', icon: '📋', badge: 'bg-blue-500' },
  diagnostico: { label: 'Diagnóstico', color: 'bg-purple-100 text-purple-800', icon: '🔍', badge: 'bg-purple-500' },
  en_reparacion: { label: 'En Reparación', color: 'bg-orange-100 text-orange-800', icon: '🔧', badge: 'bg-orange-500' },
  completado: { label: 'Completado', color: 'bg-green-100 text-green-800', icon: '✅', badge: 'bg-green-500' },
  entregado: { label: 'Entregado', color: 'bg-emerald-100 text-emerald-800', icon: '🚗', badge: 'bg-emerald-500' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: '❌', badge: 'bg-red-500' }
} as Record<string, any>

const FILTROS = ['todos', 'recibido', 'diagnostico', 'en_reparacion', 'completado', 'entregado', 'cancelado']

export default function OrdenesPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [loading, setLoading] = useState(true)
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
      const res = await fetch('/api/ordenes')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrdenes(data.ordenes || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const ordenesFiltradas = ordenes.filter(orden => {
    const pasaFiltro = filtroActivo === 'todos' || orden.estado === filtroActivo
    const clienteNombre = orden.clientes?.nombre || ''
    const vehiculoInfo = `${orden.vehiculos?.marca || ''} ${orden.vehiculos?.modelo || ''}`
    const matricula = orden.vehiculos?.matricula || ''
    
    const pasaBusqueda = 
      orden.numero_orden.toLowerCase().includes(busqueda.toLowerCase()) ||
      clienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      vehiculoInfo.toLowerCase().includes(busqueda.toLowerCase()) ||
      matricula.toLowerCase().includes(busqueda.toLowerCase())
    
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
              className="gap-2 bg-blue-600 hover:bg-blue-700"
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
                      ? 'bg-blue-600 text-white'
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
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
                      <div className="font-bold text-gray-900">{orden.numero_orden}</div>
                      <div className="text-sm text-gray-600 truncate">{orden.clientes?.nombre || '—'}</div>
                    </div>
                    <Badge className={config.color}>{config.icon}</Badge>
                  </div>

                  <div className="text-sm text-gray-700 mb-3 truncate">
                    🚗 {orden.vehiculos?.marca} {orden.vehiculos?.modelo}
                  </div>

                  {/* STATS ROW */}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                    {orden.tiempo_estimado_horas && (
                      <div>⏱️ {orden.tiempo_estimado_horas}h est.</div>
                    )}
                    {orden.total_con_iva && (
                      <div className="font-semibold text-green-600">€{orden.total_con_iva.toFixed(2)}</div>
                    )}
                    {orden.presupuesto_aprobado_por_cliente === false && (
                      <div className="text-yellow-600">⚠️ Pendiente</div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

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
