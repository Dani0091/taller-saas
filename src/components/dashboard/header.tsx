'use client'

import { Menu, LogOut, Bell, Gauge } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Vista general del taller' },
  '/dashboard/ordenes': { title: 'Órdenes', subtitle: 'Gestión de reparaciones' },
  '/dashboard/clientes': { title: 'Clientes', subtitle: 'Base de datos de clientes' },
  '/dashboard/facturas': { title: 'Facturas', subtitle: 'Facturación y cobros' },
  '/dashboard/configuracion': { title: 'Configuración', subtitle: 'Ajustes del taller' },
}

interface HeaderProps {
  user?: any
  onMenuClick?: () => void
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

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
            className="lg:hidden p-2.5 -ml-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-200"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Título con icono en móvil */}
          <div className="flex items-center gap-3">
            <div className="lg:hidden w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20">
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
          <button className="relative p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-200">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
          </button>

          {/* Separador */}
          <div className="hidden md:block w-px h-8 bg-gray-200" />

          {/* Usuario y logout */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                {user?.email?.split('@')[0] || 'Usuario'}
              </p>
              <p className="text-[10px] text-orange-500 font-medium">Plan PRO</p>
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20">
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
