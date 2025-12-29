'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Zap,
  TrendingUp,
  Clock,
  Flame,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Award,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'

export default function Dashboard() {
  const [orders, setOrders] = useState([
    { id: 1, client: 'Juan García', vehicle: 'BMW X5', status: 'completed', amount: 450 },
    { id: 2, client: 'María López', vehicle: 'Tesla Model 3', status: 'in-progress', amount: 320 },
    { id: 3, client: 'Carlos Ruiz', vehicle: 'Audi A4', status: 'pending', amount: 280 },
  ])

  const [achievements, setAchievements] = useState([
    { id: 1, name: '🏆 10 órdenes completadas', unlocked: true },
    { id: 2, name: '⭐ 50 horas de trabajo', unlocked: true },
    { id: 3, name: '💎 Cliente VIP', unlocked: false },
  ])

  const [streak, setStreak] = useState(7)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50 to-slate-50">
      {/* HEADER CON SALUDO */}
      <div className="px-6 py-8 border-b border-slate-200/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Bienvenido, Daniel
              </h1>
              <p className="text-slate-600 mt-1">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Orden
            </Button>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Card 1: Órdenes Hoy */}
            <Card className="p-6 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white overflow-hidden relative hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl"></div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold bg-white/30 px-2 py-1 rounded-full">HOY</span>
                </div>
                <h3 className="text-sm font-semibold opacity-90">Órdenes Hoy</h3>
                <p className="text-3xl font-black mt-2">12</p>
                <p className="text-xs opacity-75 mt-2">↑ 2 vs ayer</p>
              </div>
            </Card>

            {/* Card 2: Ingresos */}
            <Card className="p-6 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white overflow-hidden relative hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold bg-white/30 px-2 py-1 rounded-full">MES</span>
                </div>
                <h3 className="text-sm font-semibold opacity-90">Ingresos</h3>
                <p className="text-3xl font-black mt-2">€4,250</p>
                <p className="text-xs opacity-75 mt-2">↑ 15% vs mes anterior</p>
              </div>
            </Card>

            {/* Card 3: En Progreso */}
            <Card className="p-6 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white overflow-hidden relative hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold bg-white/30 px-2 py-1 rounded-full">ACTIVO</span>
                </div>
                <h3 className="text-sm font-semibold opacity-90">En Progreso</h3>
                <p className="text-3xl font-black mt-2">5</p>
                <p className="text-xs opacity-75 mt-2">Tiempo promedio: 2.5h</p>
              </div>
            </Card>

            {/* Card 4: Racha */}
            <Card className="p-6 bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white overflow-hidden relative hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Flame className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold bg-white/30 px-2 py-1 rounded-full">RACHA</span>
                </div>
                <h3 className="text-sm font-semibold opacity-90">Racha de Días</h3>
                <p className="text-3xl font-black mt-2">{streak}</p>
                <p className="text-xs opacity-75 mt-2">¡Sigue así! 🔥</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
