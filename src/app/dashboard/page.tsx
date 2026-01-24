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
import { TrendingUp, Wrench, CheckCircle, AlertCircle, Banknote, Receipt, FileText, Calculator, Gauge, Plus, Users, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { obtenerMetricasDashboardAction } from '@/actions/dashboard'
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/30">
            <Gauge className="w-8 h-8 text-white animate-pulse" />
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-sky-600 mx-auto mb-2" />
          <p className="text-gray-500 font-medium">Cargando dashboard...</p>
        </div>
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
            className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white">
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-sky-500/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-500" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-cyan-400 text-sm font-medium uppercase tracking-wider">En vivo</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {metricas.nombreUsuario ? `Bienvenido, ${metricas.nombreUsuario}` : 'Panel de Control'}
          </h1>
          <p className="text-gray-400 mt-1">
            {metricas.nombreTaller || 'Tu taller mecánico'}
          </p>
        </div>
      </div>

      {/* Métricas operativas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 md:p-5 bg-gradient-to-br from-sky-500 to-cyan-500 text-white border-0 shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-sky-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">Hoy</span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">Órdenes Hoy</p>
          <p className="text-2xl md:text-3xl font-bold">{metricas.ordenesHoy}</p>
        </Card>

        <Card className="p-4 md:p-5 bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">Espera</span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">Pendientes</p>
          <p className="text-2xl md:text-3xl font-bold">{metricas.pendientes}</p>
        </Card>

        <Card className="p-4 md:p-5 bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">Activo</span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">En Reparación</p>
          <p className="text-2xl md:text-3xl font-bold">{metricas.enProgreso}</p>
        </Card>

        <Card className="p-4 md:p-5 bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">Listas</span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">Completadas</p>
          <p className="text-2xl md:text-3xl font-bold">{metricas.completadas}</p>
        </Card>
      </div>

      {/* Métricas financieras - ✅ TODOS LOS VALORES PRE-CALCULADOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 md:p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Banknote className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">Mes</span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">Total Facturado</p>
          <p className="text-xl md:text-2xl font-bold">
            €{metricas.facturadoMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-4 md:p-5 bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">Neto</span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">Base Imponible</p>
          <p className="text-xl md:text-2xl font-bold">
            €{metricas.baseImponibleMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-4 md:p-5 bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">Mes</span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">IVA Recaudado</p>
          <p className="text-xl md:text-2xl font-bold">
            €{metricas.ivaRecaudadoMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-4 md:p-5 bg-gradient-to-br from-red-500 to-rose-600 text-white border-0 shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">
              T{Math.floor(new Date().getMonth() / 3) + 1}
            </span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">IVA a Pagar</p>
          <p className="text-xl md:text-2xl font-bold">
            €{metricas.ivaTrimestre.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Link href="/dashboard/ordenes" className="group">
          <Card className="p-4 md:p-5 border-2 border-sky-200 bg-sky-50 hover:bg-sky-100 hover:border-sky-300 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md shadow-sky-500/30">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Nueva Orden</p>
                  <p className="text-xs text-gray-500">Crear reparación</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-sky-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/ordenes" className="group">
          <Card className="p-4 md:p-5 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Ver Órdenes</p>
                  <p className="text-xs text-gray-500">Gestionar trabajos</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/clientes" className="group">
          <Card className="p-4 md:p-5 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Ver Clientes</p>
                  <p className="text-xs text-gray-500">Base de datos</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/facturas" className="group">
          <Card className="p-4 md:p-5 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Ver Facturas</p>
                  <p className="text-xs text-gray-500">Facturación</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
