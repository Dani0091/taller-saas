'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileText, Plus, Download, Eye, Trash2, Loader2, AlertCircle, X, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from 'vaul'
import { listarFacturasAction, anularFacturaAction } from '@/actions/facturas'
import type { FacturaListadoDTO } from '@/application/dtos'
import { EstadoFactura } from '@/domain/types'
import { useDescargarFacturasMultiple } from '@/hooks/useDescargarFacturasMultiple'
import { PERIODOS_FACTURA, rangoPeriodo, type PeriodoFactura } from '@/lib/facturas/periodo'
import { trimestreDeClave } from '@/lib/facturas/trimestres'
import { TrimestresHacienda } from '@/components/facturas/trimestres-hacienda'
import { AccionesPagina } from '@/components/dashboard/acciones-pagina'

const estadoColors: Record<string, string> = {
  'borrador': 'bg-muted text-foreground',
  'emitida': 'bg-primary/10 text-primary',
  'pagada': 'bg-success/10 text-success',
  'anulada': 'bg-destructive/10 text-destructive',
}

const estadoLabels: Record<string, string> = {
  'borrador': 'Borrador',
  'emitida': 'Emitida',
  'pagada': 'Pagada',
  'anulada': 'Anulada',
}

const POR_PAGINA = 25

interface Serie {
  id: string
  prefijo: string
  nombre?: string | null
}

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<FacturaListadoDTO[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filtroEstado, setFiltroEstado] = useState<EstadoFactura | ''>('')
  const [filtroSerie, setFiltroSerie] = useState('')
  const [series, setSeries] = useState<Serie[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [busquedaAplicada, setBusquedaAplicada] = useState('')
  const [sortBy, setSortBy] = useState<'recientes' | 'antiguos' | 'fecha_emision'>('recientes')
  const [filtroFecha, setFiltroFecha] = useState<PeriodoFactura>('todas')
  const [rangoPersonalizado, setRangoPersonalizado] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // En móvil los filtros (salvo la búsqueda) van plegados
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

  // id → número, para descargar selecciones hechas en varias páginas
  const [seleccionadas, setSeleccionadas] = useState<Map<string, string>>(new Map())

  const { descargarSeleccionadas, descargando } = useDescargarFacturasMultiple()
  // Solo cuenta la respuesta de la última petición (filtros que cambian rápido)
  const ultimaPeticion = useRef(0)

  // Enlaces desde el inicio: ?trimestre=2026-T4 y ?estado=emitida
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const trimestre = params.get('trimestre')
    if (trimestre && trimestreDeClave(trimestre)) setFiltroFecha(trimestre as PeriodoFactura)
    const estado = params.get('estado')
    if (estado && ['borrador', 'emitida', 'pagada', 'anulada'].includes(estado)) setFiltroEstado(estado as EstadoFactura)
  }, [])

  // Series del taller para el filtro
  useEffect(() => {
    fetch('/api/series/obtener')
      .then(r => (r.ok ? r.json() : { series: [] }))
      .then(d => setSeries(d.series ?? []))
      .catch(() => setSeries([]))
  }, [])

  // La búsqueda se aplica al dejar de escribir
  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda.trim()), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  // Cualquier cambio de filtro vuelve a la primera página
  useEffect(() => {
    setPagina(1)
  }, [filtroEstado, filtroSerie, busquedaAplicada, sortBy, filtroFecha, rangoPersonalizado])

  const fetchFacturas = useCallback(async () => {
    const peticion = ++ultimaPeticion.current
    try {
      setLoading(true)
      setError(null)

      const resultado = await listarFacturasAction({
        estado: filtroEstado || undefined,
        serie: filtroSerie || undefined,
        busqueda: busquedaAplicada || undefined,
        ...rangoPeriodo(filtroFecha, rangoPersonalizado),
        sortBy,
        page: pagina,
        pageSize: POR_PAGINA,
      })

      if (peticion !== ultimaPeticion.current) return
      if (!resultado.success) {
        throw new Error(resultado.error)
      }

      setFacturas(resultado.data.data)
      setTotal(resultado.data.total)
      setTotalPaginas(Math.max(1, resultado.data.totalPages))
    } catch (err: any) {
      if (peticion !== ultimaPeticion.current) return
      console.error('Error cargando facturas:', err)
      setError(err.message || 'Error al cargar facturas')
      toast.error('Error al cargar facturas')
    } finally {
      if (peticion === ultimaPeticion.current) setLoading(false)
    }
  }, [filtroEstado, filtroSerie, busquedaAplicada, filtroFecha, rangoPersonalizado, sortBy, pagina])

  useEffect(() => {
    fetchFacturas()
  }, [fetchFacturas])

  const handleDelete = async (id: string, numero?: string) => {
    if (!confirm(`¿Anular la factura ${numero ?? ''}? Quedará registrada como anulada.`)) return

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

  const hayFiltros = !!(filtroEstado || filtroSerie || busquedaAplicada || filtroFecha !== 'todas')
  const filtrosPlegadosActivos = [filtroEstado, filtroSerie, filtroFecha !== 'todas', sortBy !== 'recientes'].filter(Boolean).length
  const limpiarFiltros = () => {
    setFiltroEstado('')
    setFiltroSerie('')
    setBusqueda('')
    setBusquedaAplicada('')
    setFiltroFecha('todas')
    setRangoPersonalizado({ from: '', to: '' })
  }

  const todasSeleccionadasEnVista = facturas.length > 0 && facturas.every(f => seleccionadas.has(f.id))

  const toggleSeleccion = (f: FacturaListadoDTO) => {
    setSeleccionadas(prev => {
      const next = new Map(prev)
      if (next.has(f.id)) next.delete(f.id)
      else next.set(f.id, f.numeroFactura || f.id)
      return next
    })
  }

  const toggleSeleccionarTodas = () => {
    setSeleccionadas(prev => {
      const next = new Map(prev)
      if (todasSeleccionadasEnVista) {
        facturas.forEach(f => next.delete(f.id))
      } else {
        facturas.forEach(f => next.set(f.id, f.numeroFactura || f.id))
      }
      return next
    })
  }

  const limpiarSeleccion = () => setSeleccionadas(new Map())

  const handleDescargarSeleccionadas = async () => {
    await descargarSeleccionadas([...seleccionadas].map(([id, numeroFactura]) => ({ id, numeroFactura })))
  }

  // Los mismos controles en línea (escritorio) y en la hoja de filtros (móvil); sufijo para ids únicos
  const controlesFiltro = (sufijo: string, enRejilla = false) => (
    <>
      <div>
        <label htmlFor={`filtro-estado${sufijo}`} className="block text-sm font-semibold mb-2">Estado</label>
        <select id={`filtro-estado${sufijo}`} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as EstadoFactura | '')} className="w-full min-h-11 rounded-md border bg-card px-3 text-base md:text-sm focus:outline-none focus:ring-[3px] focus:ring-ring/50">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="emitida">Emitida</option>
          <option value="pagada">Pagada</option>
          <option value="anulada">Anulada</option>
        </select>
      </div>
      <div>
        <label htmlFor={`filtro-serie${sufijo}`} className="block text-sm font-semibold mb-2">Serie</label>
        <select id={`filtro-serie${sufijo}`} value={filtroSerie} onChange={(e) => setFiltroSerie(e.target.value)} className="w-full min-h-11 rounded-md border bg-card px-3 text-base md:text-sm focus:outline-none focus:ring-[3px] focus:ring-ring/50">
          <option value="">Todas las series</option>
          {series.map(s => (
            <option key={s.id} value={s.prefijo}>
              {s.prefijo}{s.nombre && s.nombre !== `Serie ${s.prefijo}` ? ` · ${s.nombre}` : ''}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`ordenar-facturas${sufijo}`} className="block text-sm font-semibold mb-2">Ordenar por</label>
        <select id={`ordenar-facturas${sufijo}`} value={sortBy} onChange={(e) => setSortBy(e.target.value as 'recientes' | 'antiguos' | 'fecha_emision')} className="w-full min-h-11 rounded-md border bg-card px-3 text-base md:text-sm focus:outline-none focus:ring-[3px] focus:ring-ring/50">
          <option value="recientes">Más recientes</option>
          <option value="antiguos">Más antiguos</option>
          <option value="fecha_emision">Por fecha emisión</option>
        </select>
      </div>
      {!enRejilla && periodoFiltro(sufijo)}
    </>
  )

  const periodoFiltro = (sufijo: string) => (
    <div>
      <span id={`periodo-facturas${sufijo}`} className="block text-sm font-semibold mb-2">Periodo</span>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`periodo-facturas${sufijo}`}>
        {PERIODOS_FACTURA.map(f => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filtroFecha === f.value}
            onClick={() => setFiltroFecha(f.value)}
            className={`min-h-9 rounded-full border px-3 text-sm font-medium transition-colors ${
              filtroFecha === f.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {filtroFecha === 'personalizado' && (
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <div className="flex-1">
            <label htmlFor={`periodo-desde${sufijo}`} className="block text-xs text-muted-foreground mb-1">Desde</label>
            <Input id={`periodo-desde${sufijo}`} type="date" value={rangoPersonalizado.from} onChange={(e) => setRangoPersonalizado(prev => ({ ...prev, from: e.target.value }))} />
          </div>
          <div className="flex-1">
            <label htmlFor={`periodo-hasta${sufijo}`} className="block text-xs text-muted-foreground mb-1">Hasta</label>
            <Input id={`periodo-hasta${sufijo}`} type="date" value={rangoPersonalizado.to} onChange={(e) => setRangoPersonalizado(prev => ({ ...prev, to: e.target.value }))} />
          </div>
        </div>
      )}
    </div>
  )

  const primera = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1
  const ultima = Math.min(pagina * POR_PAGINA, total)

  return (
    <div className="space-y-4 pb-20">
      <AccionesPagina>
        <Button size="sm" asChild className="gap-1.5">
          <Link href="/dashboard/facturas/nueva">
            <Plus className="size-4" aria-hidden />
            Nueva<span className="hidden sm:inline"> factura</span>
          </Link>
        </Button>
      </AccionesPagina>

      <TrimestresHacienda
        seleccionado={trimestreDeClave(filtroFecha) ? filtroFecha : null}
        onSeleccionar={(clave) => setFiltroFecha((clave as PeriodoFactura | null) ?? 'todas')}
      />

      {/* FILTROS: en línea desde sm; en móvil, en una hoja inferior (vaul) */}
      <Card className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="buscar-facturas" className="sr-only text-sm font-semibold sm:not-sr-only sm:mb-2 sm:block">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="buscar-facturas"
                type="search"
                placeholder="Número, matrícula, cliente o NIF"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Drawer.Root open={filtrosAbiertos} onOpenChange={setFiltrosAbiertos}>
            <Drawer.Trigger asChild>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-foreground sm:hidden"
              >
                <SlidersHorizontal className="size-4" aria-hidden />
                Filtros{filtrosPlegadosActivos > 0 && ` (${filtrosPlegadosActivos})`}
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
              <Drawer.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-card outline-none">
                <div aria-hidden className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
                <Drawer.Title className="px-4 pb-2 pt-3 text-lg font-semibold text-foreground">Filtros</Drawer.Title>
                <div className="space-y-4 overflow-y-auto px-4 pb-4">
                  {controlesFiltro('-movil')}
                </div>
                <div className="flex gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {hayFiltros && (
                    <Button variant="outline" size="xl" className="flex-1" onClick={limpiarFiltros}>Quitar filtros</Button>
                  )}
                  <Button size="xl" className="flex-1" onClick={() => setFiltrosAbiertos(false)}>
                    Ver {total} factura{total !== 1 ? 's' : ''}
                  </Button>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
          <div className="hidden sm:contents">
            {controlesFiltro('', true)}
          </div>
        </div>

        <div className="hidden sm:block">
          {periodoFiltro('')}
        </div>
      </Card>

      {/* LISTADO */}
      {error ? (
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-medium mb-2">Error al cargar datos</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <Button onClick={() => { setError(null); fetchFacturas(); }}>
            Reintentar
          </Button>
        </Card>
      ) : loading && facturas.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : facturas.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {hayFiltros ? 'Ninguna factura coincide con estos filtros' : 'Aún no hay facturas'}
          </p>
          {hayFiltros && (
            <Button variant="outline" className="mt-4" onClick={limpiarFiltros}>
              Quitar filtros
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-500" aria-live="polite">
              {total} factura{total !== 1 ? 's' : ''}
              {totalPaginas > 1 && <> · mostrando {primera}–{ultima}</>}
            </p>
            {hayFiltros && (
              <button type="button" onClick={limpiarFiltros} className="text-sm text-primary hover:underline">
                Quitar filtros
              </button>
            )}
          </div>
          {/* Móvil y tablet: tarjetas (por debajo de 1024 px la tabla no cabe
              sin desplazarse y esconde la columna «Acciones») */}
          <ul className={`grid grid-cols-1 gap-2 md:grid-cols-2 lg:hidden transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
            {facturas.map((factura) => (
              <li key={factura.id} className={`flex items-start gap-3 rounded-xl border bg-card p-3 shadow-xs ${seleccionadas.has(factura.id) ? 'border-primary/40 bg-primary/5' : ''}`}>
                <input
                  type="checkbox"
                  checked={seleccionadas.has(factura.id)}
                  onChange={() => toggleSeleccion(factura)}
                  className="mt-1 size-5 shrink-0 rounded border-gray-300 text-primary focus:ring-ring"
                  aria-label={`Seleccionar factura ${factura.numeroFactura ?? ''}`}
                />
                <Link href={`/dashboard/facturas/ver?id=${factura.id}`} className="min-w-0 flex-1" aria-label={`Ver factura ${factura.numeroFactura ?? ''}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{factura.numeroFactura || 'Borrador'}</span>
                    <span className="font-semibold tabular-nums text-foreground">{factura.totalFormateado}</span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-muted-foreground">
                      {factura.cliente?.nombre || 'Sin cliente'} · {new Date(factura.fechaEmision).toLocaleDateString('es-ES')}
                    </span>
                    <Badge className={estadoColors[factura.estado] || 'bg-muted text-foreground'}>
                      {estadoLabels[factura.estado] ?? factura.estado}
                    </Badge>
                  </span>
                  {factura.matricula && (
                    <span className="mt-1 inline-block rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wide text-foreground">{factura.matricula}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <Card className={`hidden lg:block overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={todasSeleccionadasEnVista}
                        onChange={toggleSeleccionarTodas}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-ring"
                        aria-label="Seleccionar todas las de esta página"
                      />
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700">Número</th>
                    <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700 hidden sm:table-cell">Fecha</th>
                    <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700 hidden lg:table-cell">Cliente</th>
                    <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700 hidden md:table-cell w-[120px]">Matrícula</th>
                    <th className="px-4 md:px-6 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                    <th className="px-4 md:px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                    <th className="px-4 md:px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((factura) => (
                    <tr key={factura.id} className={`border-b hover:bg-gray-50 transition ${seleccionadas.has(factura.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={seleccionadas.has(factura.id)}
                          onChange={() => toggleSeleccion(factura)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-ring"
                          aria-label={`Seleccionar factura ${factura.numeroFactura ?? ''}`}
                        />
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className="font-semibold text-gray-900">{factura.numeroFactura || '—'}</span>
                        {/* En móvil, cliente y fecha bajo el número */}
                        <span className="block lg:hidden text-xs text-gray-500 truncate max-w-[180px]">
                          {factura.cliente?.nombre}
                          <span className="sm:hidden">{factura.cliente?.nombre ? ' · ' : ''}{new Date(factura.fechaEmision).toLocaleDateString('es-ES')}</span>
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-600 hidden sm:table-cell tabular-nums">
                        {new Date(factura.fechaEmision).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-700 hidden lg:table-cell max-w-[220px] truncate" title={factura.cliente?.nombre}>
                        {factura.cliente?.nombre || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 md:px-6 py-4 hidden md:table-cell w-[120px]">
                        {factura.matricula ? (
                          <span className="font-mono font-semibold text-primary tracking-wider">
                            {factura.matricula}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 font-semibold text-gray-900 text-right tabular-nums whitespace-nowrap">
                        {factura.totalFormateado}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <Badge className={estadoColors[factura.estado] || 'bg-gray-100'}>
                          {estadoLabels[factura.estado] ?? factura.estado}
                        </Badge>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex justify-center gap-1 md:gap-2">
                          <Link
                            href={`/dashboard/facturas/ver?id=${factura.id}`}
                            aria-label={`Ver factura ${factura.numeroFactura ?? ''}`}
                            className="inline-flex items-center justify-center rounded-md p-2 text-primary hover:bg-primary/5"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {factura.estado === 'emitida' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(factura.id, factura.numeroFactura)}
                              disabled={deletingId === factura.id}
                              className="text-destructive p-2"
                              aria-label={`Anular factura ${factura.numeroFactura ?? ''}`}
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

          {totalPaginas > 1 && (
            <nav className="flex items-center justify-between gap-2" aria-label="Paginación de facturas">
              <Button
                variant="outline"
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina <= 1 || loading}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>
              <span className="text-sm text-gray-600 tabular-nums">
                Página {pagina} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas || loading}
                className="gap-1"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            </nav>
          )}
        </>
      )}

      {/* BARRA STICKY DE DESCARGA */}
      {seleccionadas.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-primary shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-white font-medium text-sm sm:text-base">
              {seleccionadas.size} factura{seleccionadas.size !== 1 ? 's' : ''} seleccionada{seleccionadas.size !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="xl"
                onClick={limpiarSeleccion}
                className="bg-transparent border-white text-white hover:bg-primary/90 hover:text-white gap-1"
                aria-label="Limpiar selección"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Limpiar selección</span>
              </Button>
              <Button
                size="xl"
                onClick={handleDescargarSeleccionadas}
                disabled={descargando}
                className="bg-success hover:bg-success/90 gap-2"
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
