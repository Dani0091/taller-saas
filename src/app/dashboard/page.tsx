/**
 * @fileoverview Página Principal del Dashboard
 * @description Dashboard con métricas operativas y financieras
 *
 * ✅ SANEADO: Sin createClient, sin cálculos, sin lógica de negocio
 * ✅ Solo usa Server Actions blindadas
 * ✅ Optimizado para Android de gama baja
 */

'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, Wrench, CheckCircle, AlertCircle, Banknote, Receipt, FileText, Calculator, Plus, Users, ArrowRight, Loader2, Zap } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { obtenerMetricasDashboardAction } from '@/actions/dashboard'
import { formatCurrency } from '@/lib/utils'
import type { MetricasDashboardDTO } from '@/application/dtos/dashboard.dto'

export default function DashboardPage() {
  const [metricas, setMetricas] = useState<MetricasDashboardDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargarMetricas()
  }, [])

  const cargarMetricas = async () => {
    try {
      setLoading(true)
      setError(null)

      // ✅ CORRECTO: Usar Server Action blindada
      const resultado = await obtenerMetricasDashboardAction()

      if (!resultado.success) {
        throw new Error(resultado.error)
      }

      setMetricas(resultado.data)
    } catch (err: any) {
      console.error('Error cargando métricas:', err)
      setError(err.message || 'Error al cargar métricas')
      toast.error('Error al cargar métricas del dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
        <span className="sr-only">Cargando panel</span>
      </div>
    )
  }

  // Error state
  if (error || !metricas) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-2">Error al cargar dashboard</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={cargarMetricas}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const trimestre = Math.floor(new Date().getMonth() / 3) + 1

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance">
          {metricas.nombreUsuario ? `Hola, ${metricas.nombreUsuario}` : 'Panel de control'}
        </h1>
        <p className="text-gray-600 mt-1">{metricas.nombreTaller || 'Tu taller'}</p>
      </div>

      <section aria-labelledby="titulo-taller">
        <h2 id="titulo-taller" className="text-sm font-semibold text-gray-700 mb-3">Taller</h2>
        <Card className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 p-0 overflow-hidden">
          <Indicador icono={TrendingUp} etiqueta="Órdenes de hoy" valor={metricas.ordenesHoy} />
          <Indicador icono={AlertCircle} etiqueta="Pendientes" valor={metricas.pendientes} destacar={metricas.pendientes > 0} />
          <Indicador icono={Wrench} etiqueta="En reparación" valor={metricas.enProgreso} />
          <Indicador icono={CheckCircle} etiqueta="Completadas" valor={metricas.completadas} />
        </Card>
      </section>

      <section aria-labelledby="titulo-facturacion">
        <h2 id="titulo-facturacion" className="text-sm font-semibold text-gray-700 mb-3">Facturación del mes</h2>
        <Card className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 p-0 overflow-hidden">
          <Indicador icono={Banknote} etiqueta="Total facturado" valor={formatCurrency(metricas.facturadoMes)} />
          <Indicador icono={Receipt} etiqueta="Base imponible" valor={formatCurrency(metricas.baseImponibleMes)} />
          <Indicador icono={FileText} etiqueta="IVA repercutido" valor={formatCurrency(metricas.ivaRecaudadoMes)} />
          <Indicador icono={Calculator} etiqueta={`IVA a pagar · T${trimestre}`} valor={formatCurrency(metricas.ivaTrimestre)} />
        </Card>
      </section>

      <section aria-labelledby="titulo-accesos">
        <h2 id="titulo-accesos" className="text-sm font-semibold text-gray-700 mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3">
          <Link
            href="/dashboard/ordenes?nueva=1"
            className="group flex items-center gap-3 rounded-xl bg-primary px-4 py-4 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Plus className="w-5 h-5 shrink-0" aria-hidden />
            <span className="flex-1">
              <span className="block font-semibold">Nueva orden</span>
              <span className="block text-xs text-white/85">Abrir el asistente</span>
            </span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Acceso href="/dashboard/facturas/rapida" icono={Zap} titulo="Factura rápida" detalle="Serie FS, sin orden" />
          <Acceso href="/dashboard/ordenes" icono={Wrench} titulo="Órdenes" detalle="Trabajos en curso" />
          <Acceso href="/dashboard/clientes" icono={Users} titulo="Clientes" detalle="Fichas y contacto" />
          <Acceso href="/dashboard/facturas" icono={FileText} titulo="Facturas" detalle="Emitidas y cobros" />
        </div>
      </section>
    </div>
  )
}

type Icono = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

function Indicador({ icono: Icono, etiqueta, valor, destacar = false }: { icono: Icono; etiqueta: string; valor: React.ReactNode; destacar?: boolean }) {
  return (
    <div className="bg-white p-4 md:p-5">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Icono className={`w-4 h-4 ${destacar ? 'text-amber-600' : 'text-gray-400'}`} aria-hidden />
        <span>{etiqueta}</span>
      </div>
      <p className={`mt-2 text-2xl md:text-3xl font-semibold tabular-nums tracking-tight ${destacar ? 'text-amber-700' : 'text-gray-900'}`}>
        {valor}
      </p>
    </div>
  )
}

function Acceso({ href, icono: Icono, titulo, detalle }: { href: string; icono: Icono; titulo: string; detalle: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Icono className="w-5 h-5 shrink-0 text-gray-500" aria-hidden />
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-gray-900">{titulo}</span>
        <span className="block text-xs text-gray-600 truncate">{detalle}</span>
      </span>
      <ArrowRight className="w-4 h-4 text-gray-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}
