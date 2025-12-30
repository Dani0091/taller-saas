'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp, Zap, Clock, FileText, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Metricas {
  ordenesHoy: number
  ordenesTotal: number
  facturadoMes: number
  enProgreso: number
  clientesActivos: number
}

export default function DashboardPage() {
  const supabase = createClient()
  const [metricas, setMetricas] = useState<Metricas>({
    ordenesHoy: 0,
    ordenesTotal: 0,
    facturadoMes: 0,
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

      // 1. Obtener usuario actual
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

        // 2. Cargar ordenes
        const { data: ordenes } = await supabase
          .from('ordenes_reparacion')
          .select('*')
          .eq('taller_id', tallerId)

        // 3. Cargar facturas
        const { data: facturas } = await supabase
          .from('facturas')
          .select('*')
          .eq('taller_id', tallerId)

        // 4. Cargar clientes
        const { data: clientes } = await supabase
          .from('clientes')
          .select('*')
          .eq('taller_id', tallerId)

        // Calcular métricas
        const hoy = new Date().toISOString().split('T')[0]
        const ordenesHoy = ordenes?.filter(o => 
          o.fecha_entrada?.startsWith(hoy)
        ).length || 0

        const enProgreso = ordenes?.filter(o => 
          o.estado === 'en_reparacion'
        ).length || 0

        const inicioMes = new Date()
        inicioMes.setDate(1)
        const facturasMes = facturas?.filter(f => 
          new Date(f.fecha_emision) >= inicioMes
        ) || []
        const facturadoMes = facturasMes.reduce((sum, f) => 
          sum + (f.total || 0), 0
        )

        setMetricas({
          ordenesHoy,
          ordenesTotal: ordenes?.length || 0,
          facturadoMes,
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
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">
          {usuario?.nombre ? `Bienvenido, ${usuario.nombre}` : 'Dashboard'}
        </h1>
        <p className="text-gray-600 mt-2">
          {usuario?.talleres?.nombre || 'Taller'}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Órdenes Hoy */}
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          <div className="flex justify-between items-start mb-4">
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">HOY</span>
          </div>
          <h3 className="text-sm opacity-90">Órdenes Hoy</h3>
          <p className="text-3xl font-bold mt-2">{metricas.ordenesHoy}</p>
          <p className="text-xs opacity-75 mt-1">del total: {metricas.ordenesTotal}</p>
        </Card>

        {/* Órdenes Total */}
        <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-700 text-white">
          <div className="flex justify-between items-start mb-4">
            <Zap className="w-5 h-5" />
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">TOTAL</span>
          </div>
          <h3 className="text-sm opacity-90">Órdenes Total</h3>
          <p className="text-3xl font-bold mt-2">{metricas.ordenesTotal}</p>
        </Card>

        {/* En Progreso */}
        <Card className="p-6 bg-gradient-to-br from-amber-500 to-amber-700 text-white">
          <div className="flex justify-between items-start mb-4">
            <Clock className="w-5 h-5" />
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">ACTIVO</span>
          </div>
          <h3 className="text-sm opacity-90">En Progreso</h3>
          <p className="text-3xl font-bold mt-2">{metricas.enProgreso}</p>
        </Card>

        {/* Facturado */}
        <Card className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
          <div className="flex justify-between items-start mb-4">
            <FileText className="w-5 h-5" />
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">MES</span>
          </div>
          <h3 className="text-sm opacity-90">Facturado</h3>
          <p className="text-3xl font-bold mt-2">€{metricas.facturadoMes.toLocaleString()}</p>
        </Card>

        {/* Clientes */}
        <Card className="p-6 bg-gradient-to-br from-pink-500 to-pink-700 text-white">
          <div className="flex justify-between items-start mb-4">
            <Plus className="w-5 h-5" />
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">ACTIVOS</span>
          </div>
          <h3 className="text-sm opacity-90">Clientes</h3>
          <p className="text-3xl font-bold mt-2">{metricas.clientesActivos}</p>
        </Card>
      </div>

      {/* Acciones */}
      <div className="flex gap-4 flex-wrap">
        <Link href="/dashboard/ordenes">
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700" size="lg">
            <Plus className="w-5 h-5" />
            Nueva Orden
          </Button>
        </Link>
        <Link href="/dashboard/ordenes">
          <Button variant="outline" size="lg">
            Ver Órdenes
          </Button>
        </Link>
        <Link href="/dashboard/clientes">
          <Button variant="outline" size="lg">
            Ver Clientes
          </Button>
        </Link>
        <Link href="/dashboard/facturas">
          <Button variant="outline" size="lg">
            Ver Facturas
          </Button>
        </Link>
      </div>
    </div>
  )
}
