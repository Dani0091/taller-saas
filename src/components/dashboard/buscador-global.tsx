/**
 * @fileoverview Buscador global (Ctrl+K / ⌘K)
 * @description Desde cualquier pantalla: órdenes, vehículos, clientes y
 * facturas por número, matrícula, nombre, NIF o teléfono (api/buscar), y
 * accesos para crear. Navegable con el teclado (cmdk).
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Car, FileText, Loader2, Plus, Search, User, Wrench, Zap, CalendarPlus } from 'lucide-react'
import { ESTADOS_ORDEN } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'

interface Resultados {
  ordenes: Array<{ id: string; numero_orden: string; estado: string | null; clientes: { nombre: string; apellidos?: string | null } | null; vehiculos: { matricula: string; marca?: string | null; modelo?: string | null } | null }>
  vehiculos: Array<{ id: string; matricula: string; marca: string | null; modelo: string | null }>
  clientes: Array<{ id: string; nombre: string; apellidos: string | null; nif: string | null; telefono: string | null }>
  facturas: Array<{ id: string; numero_factura: string | null; fecha_emision: string; total: number; estado: string; cliente: { nombre: string; apellidos?: string | null } | null }>
}

const VACIO: Resultados = { ordenes: [], vehiculos: [], clientes: [], facturas: [] }

const CREAR = [
  { titulo: 'Nueva orden', ruta: '/dashboard/ordenes?nueva=1', Icono: Plus },
  { titulo: 'Factura rápida', ruta: '/dashboard/facturas/rapida', Icono: Zap },
  { titulo: 'Nueva factura', ruta: '/dashboard/facturas/nueva', Icono: FileText },
  { titulo: 'Nuevo cliente', ruta: '/dashboard/clientes/nuevo', Icono: User },
  { titulo: 'Nuevo vehículo', ruta: '/dashboard/vehiculos/nuevo', Icono: Car },
  { titulo: 'Citas', ruta: '/dashboard/citas', Icono: CalendarPlus },
]

const nombre = (c?: { nombre: string; apellidos?: string | null } | null) => (c ? [c.nombre, c.apellidos].filter(Boolean).join(' ') : '')

export function BuscadorGlobal() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<Resultados>(VACIO)
  const [buscando, setBuscando] = useState(false)
  const ultima = useRef(0)

  // Ctrl+K / ⌘K desde cualquier sitio
  useEffect(() => {
    const atajo = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAbierto((v) => !v)
      }
    }
    window.addEventListener('keydown', atajo)
    return () => window.removeEventListener('keydown', atajo)
  }, [])

  // Busca al dejar de escribir; solo cuenta la última respuesta
  useEffect(() => {
    const q = texto.trim()
    if (q.length < 2) {
      setResultados(VACIO)
      setBuscando(false)
      return
    }
    setBuscando(true)
    const peticion = ++ultima.current
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`)
        const datos = res.ok ? await res.json() : VACIO
        if (peticion === ultima.current) setResultados({ ...VACIO, ...datos })
      } finally {
        if (peticion === ultima.current) setBuscando(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [texto])

  const ir = (ruta: string) => {
    setAbierto(false)
    setTexto('')
    router.push(ruta)
  }

  const hayResultados = Object.values(resultados).some((l) => l.length > 0)
  const item = 'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground data-[selected=true]:bg-accent'
  const grupo = '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground'

  return (
    <DialogPrimitive.Root open={abierto} onOpenChange={(v) => { setAbierto(v); if (!v) setTexto('') }}>
      {/* Un solo buscador: campo en escritorio, icono en móvil */}
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="hidden md:flex h-9 w-44 lg:w-56 items-center gap-2 rounded-lg border bg-background px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 truncate text-left">Buscar…</span>
          <kbd className="rounded border bg-muted px-1.5 font-sans text-[11px] text-muted-foreground">Ctrl K</kbd>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Buscar en el taller"
          className="md:hidden inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Search className="size-5" aria-hidden />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-3 top-3 z-50 mx-auto max-w-xl overflow-hidden rounded-xl border bg-popover shadow-xl sm:top-[12vh] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">Buscar en el taller</DialogPrimitive.Title>
          <Command shouldFilter={false} label="Buscar en el taller" className="flex max-h-[min(70vh,560px)] flex-col">
            <div className="flex items-center gap-2 border-b px-3">
              {buscando ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden /> : <Search className="size-4 text-muted-foreground" aria-hidden />}
              <Command.Input
                value={texto}
                onValueChange={setTexto}
                placeholder="Matrícula, cliente, NIF, teléfono o número…"
                className="h-12 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden rounded border bg-muted px-1.5 text-[11px] text-muted-foreground sm:block">Esc</kbd>
            </div>
            <Command.List className="overflow-y-auto p-2">
              {texto.trim().length >= 2 && !buscando && !hayResultados && (
                <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Nada coincide con «{texto.trim()}»
                </Command.Empty>
              )}

              {texto.trim().length < 2 && (
                <Command.Group heading="Crear" className={grupo}>
                  {CREAR.map(({ titulo, ruta, Icono }) => (
                    <Command.Item key={ruta} value={titulo} onSelect={() => ir(ruta)} className={item}>
                      <Icono className="size-4 text-muted-foreground" aria-hidden />
                      {titulo}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {resultados.ordenes.length > 0 && (
                <Command.Group heading="Órdenes" className={grupo}>
                  {resultados.ordenes.map((o) => {
                    const estado = ESTADOS_ORDEN.find((e) => e.value === o.estado)
                    return (
                      <Command.Item key={o.id} value={`orden-${o.id}`} onSelect={() => ir(`/dashboard/ordenes?orden=${o.id}`)} className={item}>
                        <Wrench className="size-4 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{o.numero_orden}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[o.vehiculos?.matricula, nombre(o.clientes)].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        {estado && (
                          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                            <span aria-hidden className={`size-2 rounded-full ${estado.color}`} />
                            {estado.label}
                          </span>
                        )}
                      </Command.Item>
                    )
                  })}
                </Command.Group>
              )}

              {resultados.vehiculos.length > 0 && (
                <Command.Group heading="Vehículos" className={grupo}>
                  {resultados.vehiculos.map((v) => (
                    <Command.Item key={v.id} value={`vehiculo-${v.id}`} onSelect={() => ir(`/dashboard/vehiculos?q=${encodeURIComponent(v.matricula)}`)} className={item}>
                      <Car className="size-4 text-muted-foreground" aria-hidden />
                      <span className="font-mono font-semibold tracking-wide">{v.matricula}</span>
                      <span className="truncate text-muted-foreground">{[v.marca, v.modelo].filter(Boolean).join(' ')}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {resultados.clientes.length > 0 && (
                <Command.Group heading="Clientes" className={grupo}>
                  {resultados.clientes.map((c) => (
                    <Command.Item key={c.id} value={`cliente-${c.id}`} onSelect={() => ir(`/dashboard/clientes?q=${encodeURIComponent(c.nombre)}`)} className={item}>
                      <User className="size-4 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{nombre(c)}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{c.telefono || c.nif}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {resultados.facturas.length > 0 && (
                <Command.Group heading="Facturas" className={grupo}>
                  {resultados.facturas.map((f) => (
                    <Command.Item key={f.id} value={`factura-${f.id}`} onSelect={() => ir(`/dashboard/facturas/ver?id=${f.id}`)} className={item}>
                      <FileText className="size-4 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{f.numero_factura || 'Borrador'}</span>
                        <span className="block truncate text-xs text-muted-foreground">{nombre(f.cliente)}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-sm">{formatCurrency(Number(f.total))}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
