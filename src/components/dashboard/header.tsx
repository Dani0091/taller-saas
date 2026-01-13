'use client'

import { useState, useEffect } from 'react'
import { Menu, LogOut, Bell, Gauge } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Vista general del taller' },
  '/dashboard/ordenes': { title: 'Órdenes', subtitle: 'Gestión de reparaciones' },
  '/dashboard/clientes': { title: 'Clientes', subtitle: 'Base de datos de clientes' },
  '/dashboard/vehiculos': { title: 'Vehículos', subtitle: 'Flota de vehículos' },
  '/dashboard/facturas': { title: 'Facturas', subtitle: 'Facturación y cobros' },
  '/dashboard/configuracion': { title: 'Configuración', subtitle: 'Ajustes del taller' },
}

interface PlanInfo {
  plan_nombre: string
  plan_display: string
  dias_restantes: number
  suscripcion_activa: boolean
  color: string
}

interface HeaderProps {
  user?: any
  onMenuClick?: () => void
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetch('/api/taller/plan')
        if (res.ok) {
          const data = await res.json()
          setPlanInfo(data)
        }
      } catch (error) {
        console.error('Error fetching plan:', error)
      }
    }
    fetchPlan()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // Obtener título de la página actual
  const pageInfo = PAGE_TITLES[pathname] || { title: 'Dashboard', subtitle: 'Vista general' }

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Botón hamburguesa para móvil */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2.5 -ml-2 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all duration-200"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Título con icono en móvil */}
          <div className="flex items-center gap-3">
            <div className="lg:hidden w-9 h-9 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md shadow-sky-500/20">
              <Gauge className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">{pageInfo.title}</h2>
              <p className="text-xs text-gray-500 hidden md:block">{pageInfo.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Notificaciones (placeholder) */}
          <button className="relative p-2 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all duration-200">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-sky-500 rounded-full" />
          </button>

          {/* Separador */}
          <div className="hidden md:block w-px h-8 bg-gray-200" />

          {/* Usuario y logout */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                {user?.email?.split('@')[0] || 'Usuario'}
              </p>
              <p
                className="text-[10px] font-medium"
                style={{ color: planInfo?.color || '#9ca3af' }}
              >
                {planInfo?.plan_display || 'Cargando...'}
                {planInfo?.plan_nombre === 'trial' && planInfo.dias_restantes > 0 && (
                  <span className="text-gray-400 ml-1">({planInfo.dias_restantes}d)</span>
                )}
              </p>
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-md shadow-sky-500/20">
              <span className="text-white font-bold text-sm">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
