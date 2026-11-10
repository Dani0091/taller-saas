'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, AlertCircle, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DetalleOrdenSheet } from '@/components/dashboard/ordenes/detalle-orden-sheet'
import { toast } from 'sonner'
import { ESTADOS_ORDEN } from '@/lib/constants'
import { AccionesPagina } from '@/components/dashboard/acciones-pagina'
import { listarOrdenesAction } from '@/actions/ordenes'
import type { OrdenListItemDTO } from '@/application/dtos/orden.dto'

// Mismo punto de color que el selector de estado de la ficha (ESTADOS_ORDEN)
const ESTADO_CONFIG: Record<string, { label: string; punto: string }> = Object.fromEntries(
  ESTADOS_ORDEN.map(e => [e.value, { label: e.label, punto: e.color }])
)

const FILTROS = ['todos', 'recibido', 'en_diagnostico', 'presupuestado', 'aprobado', 'en_progreso', 'finalizado', 'facturado', 'cancelado']

export default function OrdenesPage() {
  const [ordenes, setOrdenes] = useState<OrdenListItemDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroActivo, setFiltroActivo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<string | null>(null)
  const [modoCrear, setModoCrear] = useState(false)

  // Enlace directo a una orden (p. ej. desde una cita): /dashboard/ordenes?orden=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('orden')
    if (id) setOrdenSeleccionada(id)
    // Enlace "Nueva orden" del panel: abre el asistente
    if (params.get('nueva') === '1') setModoCrear(true)
  }, [])

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
      (orden.clienteNombre || '').toLowerCase().includes(searchLower) ||
      (orden.vehiculoMatricula || '').toLowerCase().includes(searchLower) ||
      searchLower === ''

    return pasaFiltro && pasaBusqueda
  })

  return (
    <div className="space-y-4">
      <AccionesPagina>
        <Button size="sm" className="gap-1.5" onClick={() => setModoCrear(true)}>
          <Plus className="size-4" aria-hidden />
          Nueva<span className="hidden sm:inline"> orden</span>
        </Button>
      </AccionesPagina>

      {/* BÚSQUEDA Y FILTROS */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label="Buscar órdenes"
            placeholder="Buscar orden, cliente o matrícula"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-card pl-9"
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filtrar por estado">
          {FILTROS.map(filtro => {
            const activo = filtroActivo === filtro
            const n = filtro === 'todos' ? ordenes.length : ordenes.filter(o => o.estado === filtro).length
            return (
              <button
                key={filtro}
                type="button"
                aria-pressed={activo}
                onClick={() => setFiltroActivo(filtro)}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
                  activo ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent'
                }`}
              >
                {filtro !== 'todos' && <span aria-hidden className={`size-2 rounded-full ${ESTADO_CONFIG[filtro]?.punto}`} />}
                {filtro === 'todos' ? 'Todas' : (ESTADO_CONFIG[filtro]?.label || filtro)}
                <span className={`tabular-nums text-xs ${activo ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{n}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* CONTENIDO */}
      {error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-12 text-center">
          <AlertCircle className="mb-4 size-12 text-destructive" aria-hidden />
          <p className="mb-2 font-medium text-foreground">Error al cargar las órdenes</p>
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => { setError(null); cargarOrdenes(); }}>Reintentar</Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3" role="status" aria-label="Cargando órdenes">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
      ) : ordenesFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card px-4 py-12 text-center">
          <Wrench className="mb-3 size-10 text-muted-foreground" aria-hidden />
          <p className="font-medium text-foreground">
            {busqueda || filtroActivo !== 'todos' ? 'Ninguna orden coincide' : 'Aún no hay órdenes'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {busqueda || filtroActivo !== 'todos' ? 'Prueba con otra búsqueda o quita el filtro.' : 'Crea la primera con su vehículo y cliente en cuatro pasos.'}
          </p>
          <Button className="mt-4 gap-2" onClick={() => setModoCrear(true)}>
            <Plus className="size-4" aria-hidden />
            Nueva orden
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {ordenesFiltradas.map(orden => {
            const config = ESTADO_CONFIG[orden.estado] || ESTADO_CONFIG.recibido
            return (
              <li key={orden.id}>
                <button
                  type="button"
                  onClick={() => setOrdenSeleccionada(orden.id)}
                  className="flex h-full w-full flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="flex w-full items-start justify-between gap-3">
                    <span className="font-semibold text-foreground">{orden.numeroOrden || '—'}</span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium text-foreground">
                      <span aria-hidden className={`size-2 rounded-full ${config.punto}`} />
                      {config.label}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    {orden.vehiculoMatricula ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wide text-foreground">
                        {orden.vehiculoMatricula}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Sin vehículo</span>
                    )}
                    <span className="truncate text-muted-foreground">{orden.vehiculoMarcaModelo}</span>
                  </span>
                  <span className="truncate text-sm text-foreground">{orden.clienteNombre || 'Sin cliente'}</span>
                  <span className="mt-auto flex w-full items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                    <span>{orden.cantidadLineas} {orden.cantidadLineas === 1 ? 'línea' : 'líneas'}{orden.isFacturada ? ' · Facturada' : ''}</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">{orden.total > 0 ? orden.totalFormateado : '—'}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* SHEET DE DETALLE/EDICIÓN */}
      {ordenSeleccionada && (
        <DetalleOrdenSheet
          ordenId={ordenSeleccionada}
          isOpen={!!ordenSeleccionada}
          onClose={() => {
            setOrdenSeleccionada(null)
            // Que recargar la página no vuelva a abrir la orden del enlace
            if (window.location.search.includes('orden=')) window.history.replaceState(null, '', window.location.pathname)
          }}
          onSuccess={cargarOrdenes}
        />
      )}

      {/* SHEET DE CREACIÓN */}
      {modoCrear && (
        <DetalleOrdenSheet
          modoCrear
          isOpen={modoCrear}
          onClose={() => {
            setModoCrear(false)
            if (window.location.search.includes('nueva=')) window.history.replaceState(null, '', window.location.pathname)
          }}
          onSuccess={cargarOrdenes}
          onOrdenCreada={(id) => {
            setModoCrear(false)
            if (window.location.search.includes('nueva=')) window.history.replaceState(null, '', window.location.pathname)
            setOrdenSeleccionada(id)
          }}
        />
      )}
    </div>
  )
}
