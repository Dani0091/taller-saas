/**
 * @fileoverview Inicio del panel
 * @description Lo que el taller mira al empezar el día: lo facturado este mes
 * y su evolución, el trimestre que toca presentar a Hacienda, cómo están las
 * órdenes y lo pendiente de cobro. Todo viene calculado del servidor
 * (obtenerMetricasDashboardAction → lib/dashboard/metricas).
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import NumberFlow from '@number-flow/react'
import {
  AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, FileText, Plus, Receipt, Users, Wrench, Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { obtenerMetricasDashboardAction } from '@/actions/dashboard'
import { formatCurrency } from '@/lib/utils'
import type { MetricasDashboardDTO } from '@/application/dtos/dashboard.dto'
import { GraficoFacturacion } from '@/components/dashboard/inicio/grafico-facturacion'
import { AccionesPagina } from '@/components/dashboard/acciones-pagina'

const EUROS = { style: 'currency', currency: 'EUR', useGrouping: 'always' } as const

// Paleta categórica validada (dataviz, orden de apilado: adyacentes CVD ≥ 9, normal ≥ 24).
// El aqua queda por debajo de 3:1: cada color va siempre con su nombre y su número.
const GRUPOS_ORDEN = [
  { clave: 'pendientes', etiqueta: 'Por empezar', detalle: 'Recibidas, en diagnóstico, presupuestadas y aprobadas', color: '#eb6834', estados: ['recibido', 'en_diagnostico', 'presupuestado', 'aprobado'] },
  { clave: 'taller', etiqueta: 'En reparación', detalle: 'Trabajando en ellas', color: '#2a78d6', estados: ['en_progreso'] },
  { clave: 'terminadas', etiqueta: 'Terminadas', detalle: 'Listas para facturar y entregar', color: '#1baf7a', estados: ['finalizado'] },
  { clave: 'facturadas', etiqueta: 'Facturadas', detalle: 'Cerradas con su factura', color: '#6250d6', estados: ['facturado'] },
] as const

const nombreMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number)
  return new Date(a, m - 1, 1).toLocaleDateString('es-ES', { month: 'long' })
}
const fechaLarga = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function DashboardPage() {
  const [metricas, setMetricas] = useState<MetricasDashboardDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarMetricas = async () => {
    try {
      setLoading(true)
      setError(null)
      const resultado = await obtenerMetricasDashboardAction()
      if (!resultado.success) throw new Error(resultado.error)
      setMetricas(resultado.data)
    } catch (err) {
      console.error('Error cargando métricas:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar métricas')
      toast.error('Error al cargar el inicio')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarMetricas()
  }, [])

  if (loading) return <EsqueletoInicio />

  if (error || !metricas) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-destructive" aria-hidden />
          <p className="mb-1 font-medium text-foreground">No se pudo cargar el inicio</p>
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <button onClick={cargarMetricas} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const mesActual = metricas.mensual[metricas.mensual.length - 1]
  const anterior = metricas.facturadoMesAnterior
  const variacion = anterior > 0 ? (metricas.facturadoMes - anterior) / anterior : null
  const grupos = GRUPOS_ORDEN.map((g) => ({ ...g, n: g.estados.reduce((s, e) => s + (metricas.porEstado[e] || 0), 0) }))
  const totalOrdenes = grupos.reduce((s, g) => s + g.n, 0)
  const t = metricas.trimestre
  const urgente = t.plazoAbierto || t.diasHastaFinPlazo <= 20

  return (
    <div className="space-y-6">
      {/* Saludo y acción principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h2 className="text-2xl font-bold text-foreground text-balance md:text-3xl">
            {metricas.nombreUsuario ? `Hola, ${metricas.nombreUsuario}` : 'Hola'}
          </h2>
          {metricas.nombreTaller && <p className="text-muted-foreground">{metricas.nombreTaller}</p>}
        </div>
        <AccionesPagina>
          <Link
            href="/dashboard/ordenes?nueva=1"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Plus className="size-4" aria-hidden />
            Nueva<span className="hidden sm:inline"> orden</span>
          </Link>
        </AccionesPagina>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Facturación del mes: la cifra que encabeza el panel */}
        <section aria-labelledby="titulo-facturado" className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div>
              <h2 id="titulo-facturado" className="text-sm font-medium text-muted-foreground">
                Facturado en {nombreMes(mesActual.mes)}
              </h2>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-foreground tabular-nums md:text-5xl">
                <NumberFlow value={metricas.facturadoMes} locales="es-ES" format={EUROS} />
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {variacion !== null && (
                  <span className={`inline-flex items-center gap-1 font-medium ${variacion >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {variacion >= 0 ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}
                    {variacion >= 0 ? '+' : '−'}{Math.abs(variacion * 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })} %
                    <span className="sr-only">{variacion >= 0 ? 'más' : 'menos'} que el mes anterior</span>
                  </span>
                )}
                <span>
                  {variacion !== null ? `frente a ${formatCurrency(anterior)} en ${nombreMes(metricas.mensual[4].mes)} · ` : ''}
                  {metricas.facturasMes} factura{metricas.facturasMes === 1 ? '' : 's'}
                </span>
              </p>
            </div>
            <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Base imponible</dt>
              <dd className="text-right font-medium tabular-nums text-foreground">{formatCurrency(metricas.baseImponibleMes)}</dd>
              <dt className="text-muted-foreground">IVA repercutido</dt>
              <dd className="text-right font-medium tabular-nums text-foreground">{formatCurrency(metricas.ivaRecaudadoMes)}</dd>
            </dl>
          </div>
          <div className="mt-4">
            <GraficoFacturacion meses={metricas.mensual} />
          </div>
        </section>

        {/* Trimestre a presentar */}
        <section aria-labelledby="titulo-trimestre" className="flex flex-col rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 id="titulo-trimestre" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarClock className="size-4 text-primary" aria-hidden />
              Hacienda · {t.etiqueta.split(' (')[0]}
            </h2>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${urgente ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
              {t.plazoAbierto ? 'Plazo abierto' : 'En curso'}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">IVA repercutido</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            <NumberFlow value={t.iva} locales="es-ES" format={EUROS} />
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Base imponible</dt>
            <dd className="text-right tabular-nums text-foreground">{formatCurrency(t.base)}</dd>
            <dt className="text-muted-foreground">Facturas</dt>
            <dd className="text-right tabular-nums text-foreground">{t.facturas}</dd>
          </dl>
          <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${urgente ? 'bg-warning/10 text-warning' : 'bg-muted text-foreground'}`}>
            Presentar 303 y 130 hasta el <strong className="font-semibold">{fechaLarga(t.plazoHasta)}</strong>
            {' '}({t.diasHastaFinPlazo === 0 ? 'hoy es el último día' : `faltan ${t.diasHastaFinPlazo} día${t.diasHastaFinPlazo === 1 ? '' : 's'}`})
          </p>
          <div className="mt-auto pt-4">
            <Link
              href={`/dashboard/facturas?trimestre=${t.clave}`}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Ver y exportar el trimestre
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Órdenes por estado */}
        <section aria-labelledby="titulo-ordenes" className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="titulo-ordenes" className="text-sm font-medium text-muted-foreground">Órdenes</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium tabular-nums text-foreground">{metricas.ordenesHoy}</span> entrada{metricas.ordenesHoy === 1 ? '' : 's'} hoy
            </p>
          </div>
          {totalOrdenes > 0 && (
            <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={grupos.map((g) => `${g.etiqueta}: ${g.n}`).join(', ')}>
              {grupos.filter((g) => g.n > 0).map((g) => (
                <div key={g.clave} className="h-full" style={{ width: `${(g.n / totalOrdenes) * 100}%`, backgroundColor: g.color }} title={`${g.etiqueta}: ${g.n}`} />
              ))}
            </div>
          )}
          <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {grupos.map((g) => (
              <li key={g.clave} className="rounded-lg bg-muted/60 p-3">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.etiqueta}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  <NumberFlow value={g.n} locales="es-ES" />
                </p>
                <p className="text-xs leading-snug text-muted-foreground">{g.detalle}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Pendiente de cobro */}
        <section aria-labelledby="titulo-cobro" className="flex flex-col rounded-xl border bg-card p-5 shadow-xs">
          <h2 id="titulo-cobro" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Receipt className="size-4 text-primary" aria-hidden />
            Pendiente de cobro
          </h2>
          <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
            <NumberFlow value={metricas.pendienteCobro} locales="es-ES" format={EUROS} />
          </p>
          <p className="text-sm text-muted-foreground">
            {metricas.facturasSinCobrar === 0
              ? 'Todas las facturas emitidas están cobradas'
              : `${metricas.facturasSinCobrar} factura${metricas.facturasSinCobrar === 1 ? '' : 's'} emitida${metricas.facturasSinCobrar === 1 ? '' : 's'} sin cobrar`}
          </p>
          {metricas.facturasSinCobrar > 0 && (
            <div className="mt-auto pt-4">
              <Link
                href="/dashboard/facturas?estado=emitida"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Ver facturas sin cobrar <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Accesos rápidos */}
      <nav aria-labelledby="titulo-accesos">
        <h2 id="titulo-accesos" className="mb-3 text-sm font-medium text-muted-foreground">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Acceso href="/dashboard/facturas/rapida" icono={Zap} titulo="Factura rápida" detalle="Serie FS, sin orden" tono="bg-warning/10 text-warning" />
          <Acceso href="/dashboard/ordenes" icono={Wrench} titulo="Órdenes" detalle="Trabajos en curso" tono="bg-primary/10 text-primary" />
          <Acceso href="/dashboard/clientes" icono={Users} titulo="Clientes" detalle="Fichas y contacto" tono="bg-success/10 text-success" />
          <Acceso href="/dashboard/facturas" icono={FileText} titulo="Facturas" detalle="Emitidas y cobros" tono="bg-destructive/10 text-destructive" />
        </div>
      </nav>
    </div>
  )
}

type Icono = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

function Acceso({ href, icono: Icono, titulo, detalle, tono }: { href: string; icono: Icono; titulo: string; detalle: string; tono: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:p-4"
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tono}`}>
        <Icono className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-foreground">{titulo}</span>
        <span className="block truncate text-xs text-muted-foreground">{detalle}</span>
      </span>
      <ArrowRight className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden />
    </Link>
  )
}

function EsqueletoInicio() {
  const bloque = 'rounded-xl border bg-card shadow-xs'
  return (
    <div className="space-y-6" role="status" aria-label="Cargando el inicio">
      <div className="space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${bloque} h-80 lg:col-span-2`}><div className="m-5 h-10 w-48 animate-pulse rounded bg-muted" /></div>
        <div className={`${bloque} h-80`}><div className="m-5 h-8 w-32 animate-pulse rounded bg-muted" /></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${bloque} h-44 lg:col-span-2`} />
        <div className={`${bloque} h-44`} />
      </div>
    </div>
  )
}
