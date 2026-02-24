'use client'

import { useEffect, useState } from 'react'
import { Wrench, AlertCircle, Loader2, RefreshCw } from 'lucide-react'

// Versión del bundle actual — debe coincidir con min_version de app_config
// para garantizar que todos los clientes ejecutan código actualizado.
const APP_VERSION = '1.1.0'

interface SystemConfig {
  maintenance_mode: boolean
  min_version: string
  stable_version: string
  source: string
}

interface Props {
  children: React.ReactNode
}

/**
 * SystemStatusWrapper — Kill Switch de emergencia
 *
 * Se ejecuta en el Layout principal del dashboard. En cada carga comprueba
 * app_config y actúa según el estado del sistema:
 *
 *   1. maintenance_mode = true  → Pantalla de mantenimiento (bloquea la app)
 *   2. min_version > APP_VERSION → Modal de actualización obligatoria
 *   3. Normal                   → Renderiza children sin interferencia
 *
 * El fetch es fire-and-forget con timeout de 3s para no bloquear la UX
 * si la BD no responde (en ese caso se deja pasar sin restricciones).
 */
export function SystemStatusWrapper({ children }: Props) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'maintenance' | 'update_required'>('checking')
  const [config, setConfig]   = useState<SystemConfig | null>(null)

  useEffect(() => {
    let cancelled = false

    const verificar = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3000) // 3s timeout

        const res = await fetch('/api/config/sistema', {
          signal: controller.signal,
          cache: 'no-store',
        })
        clearTimeout(timeout)

        if (!res.ok || cancelled) {
          setStatus('ok') // Fallo silencioso: dejar pasar
          return
        }

        const data: SystemConfig = await res.json()
        if (cancelled) return

        setConfig(data)

        if (data.maintenance_mode) {
          setStatus('maintenance')
          return
        }

        if (data.min_version && semverMayorQue(data.min_version, APP_VERSION)) {
          setStatus('update_required')
          return
        }

        setStatus('ok')
      } catch {
        // Timeout o error de red: modo seguro, no bloquear
        if (!cancelled) setStatus('ok')
      }
    }

    verificar()
    return () => { cancelled = true }
  }, [])

  // ── Cargando config (breve, máx 3s) ──────────────────────────────────────
  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    )
  }

  // ── MODO MANTENIMIENTO ────────────────────────────────────────────────────
  if (status === 'maintenance') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 text-center">
          <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wrench className="w-8 h-8 text-sky-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Mantenimiento Programado
          </h1>
          <p className="text-gray-500 mb-6">
            Estamos realizando mejoras en el sistema para ofrecerte una mejor
            experiencia. Volveremos en breve.
          </p>
          <div className="bg-sky-50 rounded-xl p-4 text-sm text-sky-700 font-medium">
            ⏱ Tiempo estimado de resolución: &lt; 30 minutos
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 flex items-center gap-2 mx-auto text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Comprobar de nuevo
          </button>
        </div>
      </div>
    )
  }

  // ── ACTUALIZACIÓN OBLIGATORIA ─────────────────────────────────────────────
  if (status === 'update_required') {
    const handleActualizar = () => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch { /* modo privado */ }

      if ('caches' in window) {
        caches.keys()
          .then(names => Promise.all(names.map(n => caches.delete(n))))
          .catch(() => {})
          .finally(() => window.location.reload())
      } else {
        window.location.reload()
      }
    }

    return (
      <>
        {/* Overlay semi-transparente sobre la app (no bloquea a nivel DNS) */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Nueva versión disponible
            </h2>
            <p className="text-gray-500 mb-2">
              Tu sesión está usando una versión desactualizada del sistema.
              Necesitas refrescar para continuar.
            </p>
            <div className="flex justify-center gap-4 text-xs text-gray-400 mb-6 font-mono">
              <span>Tu versión: <strong>{APP_VERSION}</strong></span>
              <span>Requerida: <strong>{config?.min_version}</strong></span>
            </div>
            <button
              onClick={handleActualizar}
              className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Actualizar ahora (limpiar caché)
            </button>
            <p className="mt-4 text-xs text-gray-400">
              Esto limpiará los datos de sesión locales. Tu trabajo guardado en
              el servidor no se verá afectado.
            </p>
          </div>
        </div>
        {/* Renderizar la app detrás del overlay para que el DOM exista */}
        {children}
      </>
    )
  }

  // ── ESTADO NORMAL ─────────────────────────────────────────────────────────
  return <>{children}</>
}

// ── Utilidad: comparar versiones semánticas ──────────────────────────────────
// Devuelve true si versionA > versionB (ej: '1.2.0' > '1.1.0')
function semverMayorQue(versionA: string, versionB: string): boolean {
  const parsear = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0)
  const [mA, mB] = [parsear(versionA), parsear(versionB)]
  for (let i = 0; i < 3; i++) {
    if ((mA[i] ?? 0) > (mB[i] ?? 0)) return true
    if ((mA[i] ?? 0) < (mB[i] ?? 0)) return false
  }
  return false
}
