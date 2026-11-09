/**
 * @fileoverview Header del Dashboard - SANEADO
 * @description Header principal con navegación y logout
 *
 * ✅ SANEADO: Sin createClient directo
 * ✅ Usa Server Action para logout
 * ✅ Optimizado para Android de gama baja (130 líneas)
 */

'use client'

import { useState, useEffect } from 'react'
import { Menu, LogOut } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cerrarSesionAction } from '@/actions/auth'
import { toast } from 'sonner'
import { tituloDePagina } from '@/lib/navegacion/titulo-pagina'
import { BuscadorGlobal } from './buscador-global'
import { ID_ACCIONES_PAGINA } from './acciones-pagina'


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
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

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
    if (loggingOut) return

    try {
      setLoggingOut(true)

      // ✅ CORRECTO: Usar Server Action en lugar de createClient directo
      const resultado = await cerrarSesionAction()

      if (!resultado.success) {
        throw new Error(resultado.error)
      }

      // Redirigir al login
      router.push('/auth/login')
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error)
      toast.error('Error al cerrar sesión')
      setLoggingOut(false)
    }
  }

  // Obtener título de la página actual
  const pageInfo = tituloDePagina(pathname)

  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:px-6 md:py-3">
      <div className="flex items-center gap-2 md:gap-4">
        {/* Botón hamburguesa para móvil */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="lg:hidden inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Menu className="size-6" />
        </button>

        {/* Título de la sección: el único de la página */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-foreground md:text-xl">{pageInfo.title}</h1>
          <p className="hidden truncate text-xs text-muted-foreground md:block">{pageInfo.subtitle}</p>
        </div>

        {/* Acciones de la página (AccionesPagina) */}
        <div id={ID_ACCIONES_PAGINA} className="flex shrink-0 items-center gap-2" />

        <BuscadorGlobal />

        {/* Usuario y salir */}
        <div className="hidden items-center gap-3 border-l pl-4 xl:flex">
          <div className="text-right">
            <p className="max-w-[150px] truncate text-sm font-medium text-foreground">
              {user?.email?.split('@')[0] || 'Usuario'}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">
              {planInfo?.plan_display || 'Cargando...'}
              {planInfo?.plan_nombre === 'trial' && planInfo.dias_restantes > 0 && (
                <span className="ml-1">({planInfo.dias_restantes} d)</span>
              )}
            </p>
          </div>
          <div aria-hidden className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="shrink-0 gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Cerrar sesión"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">{loggingOut ? 'Saliendo...' : 'Salir'}</span>
        </Button>
      </div>
    </header>
  )
}
