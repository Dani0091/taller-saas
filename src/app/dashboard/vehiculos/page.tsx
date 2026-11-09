'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, Search, AlertCircle, Car, User, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DetalleVehiculoSheet } from '@/components/dashboard/vehiculos/detalle-vehiculo-sheet'
import { toast } from 'sonner'
import { AccionesPagina } from '@/components/dashboard/acciones-pagina'
import { listarVehiculosAction } from '@/actions/vehiculos'
import type { VehiculoListadoDTO } from '@/application/dtos/vehiculo.dto'

const COMBUSTIBLE_CONFIG: Record<string, { label: string }> = {
  gasolina: { label: 'Gasolina' },
  diésel: { label: 'Diésel' },
  diesel: { label: 'Diésel' },
  híbrido: { label: 'Híbrido' },
  hibrido: { label: 'Híbrido' },
  eléctrico: { label: 'Eléctrico' },
  electrico: { label: 'Eléctrico' },
  GLP: { label: 'GLP' },
  glp: { label: 'GLP' },
}

// Muestra de color de la carrocería (solo decorativa: el nombre va siempre al lado)
const MUESTRA_COLOR: Record<string, string> = {
  blanco: '#ffffff', negro: '#111827', rojo: '#dc2626', azul: '#2563eb', gris: '#6b7280', plata: '#9ca3af', verde: '#15803d', amarillo: '#eab308', naranja: '#ea580c', marron: '#78350f', marrón: '#78350f',
}

const FILTROS_COMBUSTIBLE = ['todos', 'gasolina', 'diésel', 'híbrido', 'eléctrico', 'GLP']

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<VehiculoListadoDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroActivo, setFiltroActivo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  // ?q= desde el buscador global: el listado se abre ya filtrado (tras navegar, la URL ya está puesta)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setBusqueda(q)
  }, [])
  const [sortBy, setSortBy] = useState<'recientes' | 'antiguos'>('recientes')
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<string | null>(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true
      cargarVehiculos()
    }
  }, [])

  useEffect(() => {
    if (initRef.current) cargarVehiculos()
  }, [sortBy])

  const cargarVehiculos = async () => {
    try {
      setLoading(true)
      setError(null)

      // Usar Server Action blindada en lugar de Supabase directo
      const resultado = await listarVehiculosAction({
        incluirEliminados: false,
        soloSinCliente: false,
        soloConDatosCompletos: false,
        sortBy,
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
      (vehiculo.modelo?.toLowerCase() || '').includes(searchLower)

    return pasaFiltro && pasaBusqueda
  })

  return (
    <div className="space-y-4">
      <AccionesPagina>
        <Button size="sm" asChild className="gap-1.5">
          <Link href="/dashboard/vehiculos/nuevo">
            <Plus className="size-4" aria-hidden />
            Nuevo<span className="hidden sm:inline"> vehículo</span>
          </Link>
        </Button>
      </AccionesPagina>

      {/* BÚSQUEDA, ORDEN Y COMBUSTIBLE */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              aria-label="Buscar vehículos"
              placeholder="Buscar matrícula, marca o modelo"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="bg-card pl-9"
            />
          </div>
          <select
            aria-label="Ordenar vehículos"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recientes' | 'antiguos')}
            className="min-h-11 rounded-md border bg-card px-3 text-sm focus:outline-none focus:ring-[3px] focus:ring-ring/50"
          >
            <option value="recientes">Más recientes</option>
            <option value="antiguos">Más antiguos</option>
          </select>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide md:mx-0 md:px-0" role="group" aria-label="Filtrar por combustible">
          {FILTROS_COMBUSTIBLE.map(filtro => {
            const activo = filtroActivo === filtro
            return (
              <button
                key={filtro}
                type="button"
                aria-pressed={activo}
                onClick={() => setFiltroActivo(filtro)}
                className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-sm font-medium transition-colors ${
                  activo ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent'
                }`}
              >
                {filtro === 'todos' ? 'Todos' : (COMBUSTIBLE_CONFIG[filtro]?.label || filtro)}
              </button>
            )
          })}
        </div>
        {!loading && !error && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {vehiculosFiltrados.length} vehículo{vehiculosFiltrados.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* CONTENIDO */}
      {error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-12 text-center">
          <AlertCircle className="mb-4 size-12 text-destructive" aria-hidden />
          <p className="mb-2 font-medium text-foreground">Error al cargar los vehículos</p>
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => { setError(null); cargarVehiculos(); }}>Reintentar</Button>
        </div>
      ) : loading ? (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3" role="status" aria-label="Cargando vehículos">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-xl border bg-card" />)}
        </div>
      ) : vehiculosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card px-4 py-12 text-center">
          <Car className="mb-3 size-10 text-muted-foreground" aria-hidden />
          <p className="font-medium text-foreground">{vehiculos.length === 0 ? 'Aún no hay vehículos' : 'Ningún vehículo coincide'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {vehiculos.length === 0 ? 'Se añaden aquí o al crear una orden por su matrícula.' : 'Prueba con otra matrícula o quita el filtro.'}
          </p>
          {vehiculos.length === 0 && (
            <Button asChild className="mt-4 gap-2">
              <Link href="/dashboard/vehiculos/nuevo"><Plus className="size-4" aria-hidden />Nuevo vehículo</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {vehiculosFiltrados.map(vehiculo => {
            const combustible = COMBUSTIBLE_CONFIG[vehiculo.tipoCombustible || ''] || COMBUSTIBLE_CONFIG[vehiculo.tipoCombustible?.toLowerCase() || '']
            const muestra = vehiculo.color ? MUESTRA_COLOR[vehiculo.color.toLowerCase()] : undefined
            const descripcion = [vehiculo.marca, vehiculo.modelo, vehiculo.año].filter(Boolean).join(' ')
            return (
              <li key={vehiculo.id}>
                <button
                  type="button"
                  onClick={() => setVehiculoSeleccionado(vehiculo.id)}
                  className="flex h-full w-full flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="flex w-full items-start justify-between gap-3">
                    <span className="rounded-md border-2 border-foreground/80 bg-background px-2 py-0.5 font-mono text-base font-bold tracking-wider text-foreground">
                      {vehiculo.matricula}
                    </span>
                    {combustible && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{combustible.label}</span>
                    )}
                  </span>
                  <span className="truncate font-medium text-foreground">{descripcion || 'Sin marca ni modelo'}</span>
                  <span className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {vehiculo.color && (
                      <span className="inline-flex items-center gap-1.5">
                        {muestra && <span aria-hidden className="size-3 rounded-full border" style={{ backgroundColor: muestra }} />}
                        {vehiculo.color}
                      </span>
                    )}
                    {vehiculo.kilometros ? (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Gauge className="size-3.5" aria-hidden />
                        {vehiculo.kilometros.toLocaleString('es-ES', { useGrouping: 'always' })} km
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3.5" aria-hidden />
                      {vehiculo.tieneCliente ? 'Con cliente' : 'Sin cliente'}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
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
