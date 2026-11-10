'use client'

import { useState, useEffect } from 'react'
import { Edit, Mail, MapPin, Phone, Plus, Search, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccionesPagina } from '@/components/dashboard/acciones-pagina'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import type { ClienteListadoDTO } from '@/application/dtos'
import { EditarClienteSheet } from './editar-cliente-sheet'
import { FormClienteSheet } from './form-cliente-sheet'

interface ListadoClientesProps {
  clientes: ClienteListadoDTO[]
  onActualizar: () => void
  sortBy?: 'recientes' | 'antiguos' | 'alfabetico'
  onSortByChange?: (sortBy: 'recientes' | 'antiguos' | 'alfabetico') => void
}

export function ListadoClientes({ clientes, onActualizar, sortBy = 'recientes', onSortByChange }: ListadoClientesProps) {
  const [searchTerm, setSearchTerm] = useState('')
  // ?q= desde el buscador global: el listado se abre ya filtrado (tras navegar, la URL ya está puesta)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setSearchTerm(q)
  }, [])
  const [clienteEditando, setClienteEditando] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [cargando, setCargando] = useState(false)

  // El orden ya lo aplica el servidor según `sortBy`; aquí sólo se filtra por
  // búsqueda, sin re-ordenar (evita pisar "alfabético"/"antiguos" con un
  // orden fijo por fecha).
  const clientesFiltrados = clientes.filter(c =>
    !searchTerm ||
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono?.includes(searchTerm)
  )

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar cliente? (Se archivará, no se borrará)')) return

    try {
      setCargando(true)
      const res = await fetch(`/api/clientes/actualizar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: 'archivado' })
      })

      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('Cliente archivado')
      onActualizar()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-4">
      <AccionesPagina>
        <Button size="sm" onClick={() => setMostrarFormulario(true)} className="gap-1.5">
          <Plus className="size-4" aria-hidden />
          Nuevo<span className="hidden sm:inline"> cliente</span>
        </Button>
      </AccionesPagina>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label="Buscar clientes"
            placeholder="Buscar por nombre, NIF o teléfono"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-card pl-9"
          />
        </div>
        <select
          aria-label="Ordenar clientes"
          value={sortBy}
          onChange={(e) => onSortByChange?.(e.target.value as 'recientes' | 'antiguos' | 'alfabetico')}
          className="min-h-11 rounded-md border bg-card px-3 text-sm focus:outline-none focus:ring-[3px] focus:ring-ring/50"
        >
          <option value="recientes">Más recientes</option>
          <option value="antiguos">Más antiguos</option>
          <option value="alfabetico">Alfabético A-Z</option>
        </select>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {clientesFiltrados.length} cliente{clientesFiltrados.length === 1 ? '' : 's'}
        {searchTerm && clientes.length !== clientesFiltrados.length ? ` de ${clientes.length}` : ''}
      </p>

      {clientesFiltrados.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center">
          <Users className="mx-auto mb-3 size-10 text-muted-foreground" aria-hidden />
          <p className="font-medium text-foreground">{clientes.length === 0 ? 'Aún no hay clientes' : 'Ningún cliente coincide'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {clientes.length === 0 ? 'Puedes crearlos aquí o al hacer una orden o una factura.' : 'Prueba con el nombre, el NIF o el teléfono.'}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {clientesFiltrados.map(cliente => (
            <li key={cliente.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setClienteEditando(cliente.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') setClienteEditando(cliente.id) }}
                className="flex h-full cursor-pointer gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {cliente.nombre.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-foreground">{cliente.nombre}</h3>
                  {cliente.nif && (
                    <p className="text-sm text-muted-foreground">
                      <span className="text-xs font-semibold">NIF</span> <span className="tabular-nums">{cliente.nif}</span>
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {cliente.telefono && (
                      <a
                        href={`tel:${cliente.telefono}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex min-h-9 items-center gap-1 text-primary hover:underline sm:min-h-0"
                      >
                        <Phone className="size-4" aria-hidden /> {cliente.telefono}
                      </a>
                    )}
                    {cliente.email && (
                      <a
                        href={`mailto:${cliente.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex min-h-9 min-w-0 items-center gap-1 text-primary hover:underline sm:min-h-0"
                      >
                        <Mail className="size-4 shrink-0" aria-hidden /> <span className="truncate">{cliente.email}</span>
                      </a>
                    )}
                  </div>
                  {cliente.direccion && (
                    <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
                      <MapPin className="size-4 shrink-0" aria-hidden /> {cliente.direccion}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); setClienteEditando(cliente.id) }}
                    aria-label={`Editar cliente ${cliente.nombre}`}
                  >
                    <Edit className="size-4" aria-hidden />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleEliminar(cliente.id) }}
                    disabled={cargando}
                    aria-label={`Eliminar cliente ${cliente.nombre}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {mostrarFormulario && (
        <FormClienteSheet
          onClose={() => setMostrarFormulario(false)}
          onActualizar={() => {
            setMostrarFormulario(false)
            onActualizar()
          }}
        />
      )}

      {clienteEditando && (
        <EditarClienteSheet
          clienteId={clienteEditando}
          onClose={() => setClienteEditando(null)}
          onActualizar={() => {
            setClienteEditando(null)
            onActualizar()
          }}
        />
      )}
    </div>
  )
}
