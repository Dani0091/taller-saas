'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, Menu, Loader2, AlertCircle, Car, User, Fuel, Calendar, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DetalleVehiculoSheet } from '@/components/dashboard/vehiculos/detalle-vehiculo-sheet'
import { toast } from 'sonner'
import { listarVehiculosAction } from '@/actions/vehiculos'
import type { VehiculoListadoDTO } from '@/application/dtos/vehiculo.dto'

const COMBUSTIBLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  gasolina: { label: 'Gasolina', color: 'bg-red-100 text-red-800', icon: '⛽' },
  diésel: { label: 'Diésel', color: 'bg-gray-100 text-gray-800', icon: '🛢️' },
  diesel: { label: 'Diésel', color: 'bg-gray-100 text-gray-800', icon: '🛢️' },
  híbrido: { label: 'Híbrido', color: 'bg-green-100 text-green-800', icon: '🔋' },
  hibrido: { label: 'Híbrido', color: 'bg-green-100 text-green-800', icon: '🔋' },
  eléctrico: { label: 'Eléctrico', color: 'bg-blue-100 text-blue-800', icon: '⚡' },
  electrico: { label: 'Eléctrico', color: 'bg-blue-100 text-blue-800', icon: '⚡' },
  GLP: { label: 'GLP', color: 'bg-purple-100 text-purple-800', icon: '🔥' },
  glp: { label: 'GLP', color: 'bg-purple-100 text-purple-800', icon: '🔥' },
}

const FILTROS_COMBUSTIBLE = ['todos', 'gasolina', 'diésel', 'híbrido', 'eléctrico', 'GLP']

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<VehiculoListadoDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroActivo, setFiltroActivo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [mostrarMenu, setMostrarMenu] = useState(false)
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<string | null>(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true
      cargarVehiculos()
    }
  }, [])

  const cargarVehiculos = async () => {
    try {
      setLoading(true)
      setError(null)

      // Usar Server Action blindada en lugar de Supabase directo
      const resultado = await listarVehiculosAction({
        incluirEliminados: false,
        page: 1,
        pageSize: 100
      })

      if (!resultado.success) {
        throw new Error(resultado.error)
      }

      setVehiculos(resultado.data.data)
    } catch (err: any) {
      console.error('Error cargando vehículos:', err)
      setError(err.message || 'Error al cargar vehículos')
      toast.error('Error al cargar vehículos')
    } finally {
      setLoading(false)
    }
  }

  const vehiculosFiltrados = vehiculos.filter(vehiculo => {
    // Filtro por combustible
    const pasaFiltro = filtroActivo === 'todos' ||
      vehiculo.tipoCombustible?.toLowerCase() === filtroActivo.toLowerCase()

    // Búsqueda
    const searchLower = busqueda.toLowerCase()

    const pasaBusqueda =
      vehiculo.matricula.toLowerCase().includes(searchLower) ||
      (vehiculo.marca?.toLowerCase() || '').includes(searchLower) ||
      (vehiculo.modelo?.toLowerCase() || '').includes(searchLower) ||
      (vehiculo.clienteNombre || '').toLowerCase().includes(searchLower)

    return pasaFiltro && pasaBusqueda
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-8">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <div className="flex gap-2">
            <Link href="/dashboard/vehiculos/nuevo">
              <Button
                size="sm"
                className="gap-2 bg-sky-600 hover:bg-sky-700"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo</span>
              </Button>
            </Link>
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
            placeholder="Buscar matrícula, marca, modelo, cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* MENÚ/FILTROS */}
        {mostrarMenu && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Filtrar por combustible:</p>
            <div className="flex flex-wrap gap-2">
              {FILTROS_COMBUSTIBLE.map(filtro => (
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
                  {filtro === 'todos' ? 'Todos' : (COMBUSTIBLE_CONFIG[filtro]?.label || filtro)}
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
            <Button onClick={() => { setError(null); cargarVehiculos(); }}>
              Reintentar
            </Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          </div>
        ) : vehiculosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Car className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium">Sin vehículos</p>
            <Link href="/dashboard/vehiculos/nuevo">
              <Button className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Crear primer vehículo
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {vehiculosFiltrados.map(vehiculo => {
              const combustibleConfig = COMBUSTIBLE_CONFIG[vehiculo.tipoCombustible?.toLowerCase() || ''] ||
                { label: vehiculo.tipoCombustible || 'N/A', color: 'bg-gray-100 text-gray-600', icon: '🚗' }

              return (
                <Card
                  key={vehiculo.id}
                  onClick={() => setVehiculoSeleccionado(vehiculo.id)}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 active:bg-gray-100 border-l-sky-500"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-lg">{vehiculo.matricula}</div>
                      <div className="text-sm text-gray-700">
                        {vehiculo.descripcionCompleta}
                      </div>
                    </div>
                    <Badge className={combustibleConfig.color}>
                      {combustibleConfig.icon}
                    </Badge>
                  </div>

                  {/* Cliente */}
                  {vehiculo.tieneCliente && vehiculo.clienteNombre && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <User className="w-3.5 h-3.5" />
                      <span>{vehiculo.clienteNombre}</span>
                    </div>
                  )}

                  {/* STATS ROW */}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                    {vehiculo.color && (
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: vehiculo.color.toLowerCase() === 'blanco' ? '#fff' :
                            vehiculo.color.toLowerCase() === 'negro' ? '#000' :
                            vehiculo.color.toLowerCase() === 'rojo' ? '#dc2626' :
                            vehiculo.color.toLowerCase() === 'azul' ? '#2563eb' :
                            vehiculo.color.toLowerCase() === 'gris' ? '#6b7280' :
                            vehiculo.color.toLowerCase() === 'plata' ? '#9ca3af' :
                            '#d1d5db'
                          }}
                        />
                        {vehiculo.color}
                      </div>
                    )}
                    {vehiculo.kilometros && (
                      <div className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5" />
                        {vehiculo.kilometrosFormateados}
                      </div>
                    )}
                    {vehiculo.carroceria && (
                      <div>{vehiculo.carroceria}</div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Resumen */}
      {!loading && vehiculosFiltrados.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">
            {vehiculosFiltrados.length} vehículo{vehiculosFiltrados.length !== 1 ? 's' : ''}
            {filtroActivo !== 'todos' && ` (${COMBUSTIBLE_CONFIG[filtroActivo]?.label || filtroActivo})`}
          </div>
        </div>
      )}

      {/* SHEET DE DETALLES */}
      {vehiculoSeleccionado && (
        <DetalleVehiculoSheet
          vehiculoId={vehiculoSeleccionado}
          onClose={() => setVehiculoSeleccionado(null)}
          onActualizar={cargarVehiculos}
        />
      )}
    </div>
  )
}
