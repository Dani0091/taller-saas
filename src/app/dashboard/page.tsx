'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp, Wrench, Clock, FileText, Loader2, Users, ArrowRight, Gauge, Receipt, Banknote, Calculator } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Metricas {
  ordenesHoy: number
  ordenesTotal: number
  facturadoMes: number
  baseImponibleMes: number
  ivaRecaudadoMes: number
  ivaTrimestre: number
  enProgreso: number
  clientesActivos: number
}

export default function DashboardPage() {
  const supabase = createClient()
  const [metricas, setMetricas] = useState<Metricas>({
    ordenesHoy: 0,
    ordenesTotal: 0,
    facturadoMes: 0,
    baseImponibleMes: 0,
    ivaRecaudadoMes: 0,
    ivaTrimestre: 0,
    enProgreso: 0,
    clientesActivos: 0,
  })
  const [usuario, setUsuario] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('*, talleres(nombre)')
        .eq('email', session.user.email)
        .single()

      if (usuarioData) {
        setUsuario(usuarioData)
        const tallerId = usuarioData.taller_id

        const { data: ordenes } = await supabase
          .from('ordenes_reparacion')
          .select('*')
          .eq('taller_id', tallerId)

        const { data: facturas } = await supabase
          .from('facturas')
          .select('*')
          .eq('taller_id', tallerId)

        const { data: clientes } = await supabase
          .from('clientes')
          .select('*')
          .eq('taller_id', tallerId)

        const hoy = new Date().toISOString().split('T')[0]
        const ordenesHoy = ordenes?.filter(o =>
          o.fecha_entrada?.startsWith(hoy)
        ).length || 0

        const enProgreso = ordenes?.filter(o =>
          o.estado === 'en_reparacion'
        ).length || 0

        // Calcular fechas para filtros
        const ahora = new Date()
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

        // Calcular inicio del trimestre actual
        const trimestre = Math.floor(ahora.getMonth() / 3)
        const inicioTrimestre = new Date(ahora.getFullYear(), trimestre * 3, 1)

        // Facturas del mes
        const facturasMes = facturas?.filter(f =>
          new Date(f.fecha_emision) >= inicioMes
        ) || []

        // Facturas del trimestre
        const facturasTrimestre = facturas?.filter(f =>
          new Date(f.fecha_emision) >= inicioTrimestre
        ) || []

        // Calcular totales del mes
        const facturadoMes = facturasMes.reduce((sum, f) => sum + (f.total || 0), 0)
        const baseImponibleMes = facturasMes.reduce((sum, f) => sum + (f.base_imponible || 0), 0)
        const ivaRecaudadoMes = facturasMes.reduce((sum, f) => sum + (f.iva || 0), 0)

        // IVA del trimestre (a pagar a Hacienda)
        const ivaTrimestre = facturasTrimestre.reduce((sum, f) => sum + (f.iva || 0), 0)

        setMetricas({
          ordenesHoy,
          ordenesTotal: ordenes?.length || 0,
          facturadoMes,
          baseImponibleMes,
          ivaRecaudadoMes,
          ivaTrimestre,
          enProgreso,
          clientesActivos: clientes?.length || 0,
        })
      }
    } catch (error: any) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/30 animate-pulse">
            <Gauge className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-500 font-medium">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white">
        {/* Decoration */}
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-sky-500/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-500" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-cyan-400 text-sm font-medium uppercase tracking-wider">En vivo</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {usuario?.nombre ? `Bienvenido, ${usuario.nombre}` : 'Panel de Control'}
          </h1>
          <p className="text-gray-400 mt-1">
            {usuario?.talleres?.nombre || 'Tu taller mecánico'}
          </p>
        </div>
      </div>

      {/* Métricas operativas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Órdenes Hoy */}
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

        {/* Órdenes Total */}
        <Card className="p-4 md:p-5 bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center">
              <Wrench className="w-5 h-5 text-sky-400" />
            </div>
            <span className="text-[10px] font-bold bg-sky-500/20 text-sky-400 px-2 py-1 rounded-full uppercase">Total</span>
          </div>
          <p className="text-gray-400 text-xs font-medium mb-1">Órdenes Total</p>
          <p className="text-2xl md:text-3xl font-bold">{metricas.ordenesTotal}</p>
        </Card>

        {/* En Progreso */}
        <Card className="p-4 md:p-5 bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">Activo</span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">En Progreso</p>
          <p className="text-2xl md:text-3xl font-bold">{metricas.enProgreso}</p>
        </Card>

        {/* Clientes */}
        <Card className="p-4 md:p-5 bg-gradient-to-br from-sky-600 to-sky-700 text-white border-0 shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-sky-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">Activos</span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">Clientes</p>
          <p className="text-2xl md:text-3xl font-bold">{metricas.clientesActivos}</p>
        </Card>
      </div>

      {/* Métricas financieras */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Facturado */}
        <Card className="p-4 md:p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Banknote className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">Mes</span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">Total Facturado</p>
          <p className="text-xl md:text-2xl font-bold">€{metricas.facturadoMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
        </Card>

        {/* Base Imponible */}
        <Card className="p-4 md:p-5 bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">Neto</span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">Base Imponible</p>
          <p className="text-xl md:text-2xl font-bold">€{metricas.baseImponibleMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
        </Card>

        {/* IVA Recaudado Mes */}
        <Card className="p-4 md:p-5 bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">Mes</span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">IVA Recaudado</p>
          <p className="text-xl md:text-2xl font-bold">€{metricas.ivaRecaudadoMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
        </Card>

        {/* IVA Trimestre (a pagar) */}
        <Card className="p-4 md:p-5 bg-gradient-to-br from-red-500 to-rose-600 text-white border-0 shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase">T{Math.floor(new Date().getMonth() / 3) + 1}</span>
          </div>
          <p className="text-white/80 text-xs font-medium mb-1">IVA a Pagar</p>
          <p className="text-xl md:text-2xl font-bold">€{metricas.ivaTrimestre.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
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
