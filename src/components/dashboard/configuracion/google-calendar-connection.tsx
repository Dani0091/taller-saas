'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, Calendar, Check, X, ExternalLink, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface GoogleCalendarStatus {
  connected: boolean
  configured: boolean
  google_email?: string
  calendar_id?: string
  connected_at?: string
}

export function GoogleCalendarConnection() {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetchStatus()

    // Verificar si venimos del callback de OAuth
    const params = new URLSearchParams(window.location.search)
    const googleSuccess = params.get('google_success')
    const googleError = params.get('google_error')

    if (googleSuccess === 'connected') {
      toast.success('Google Calendar conectado correctamente')
      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname)
      fetchStatus()
    } else if (googleError) {
      const errorMessages: Record<string, string> = {
        denied: 'Acceso denegado. No se autorizó el acceso a Google Calendar.',
        invalid: 'Respuesta inválida de Google.',
        invalid_state: 'Error de seguridad. Inténtalo de nuevo.',
        expired: 'La sesión expiró. Inténtalo de nuevo.',
        unauthorized: 'No autorizado. Inicia sesión de nuevo.',
        user_not_found: 'Usuario no encontrado.',
        save_failed: 'Error guardando la conexión.',
        unknown: 'Error desconocido.',
      }
      toast.error(errorMessages[googleError] || 'Error conectando Google Calendar')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/calendar/google/status')
      const data = await res.json()
      setStatus(data)
    } catch (error) {
      console.error('Error obteniendo estado:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    // Redirigir a la ruta de autorización
    window.location.href = '/api/calendar/google/authorize'
  }

  const handleDisconnect = async () => {
    if (!confirm('¿Deseas desconectar tu cuenta de Google Calendar?')) return

    setDisconnecting(true)
    try {
      const res = await fetch('/api/calendar/google/status', {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Error desconectando')
      }

      toast.success('Google Calendar desconectado')
      fetchStatus()
    } catch (error) {
      toast.error('Error desconectando Google Calendar')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <span className="text-gray-500">Cargando estado de Google Calendar...</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b">
        <div className="w-10 h-10 bg-white rounded-lg shadow flex items-center justify-center">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path fill="#4285F4" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"/>
            <path fill="#fff" d="M12 6v6.5l4.5 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Google Calendar</h3>
          <p className="text-sm text-gray-500">Sincroniza citas y órdenes con tu calendario</p>
        </div>
      </div>

      {!status?.configured ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Configuración requerida</p>
              <p className="text-sm text-amber-700 mt-1">
                Para usar Google Calendar, el administrador debe configurar las credenciales
                de Google (GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET) en las variables de entorno.
              </p>
            </div>
          </div>
        </div>
      ) : status.connected ? (
        <div className="space-y-4">
          {/* Estado conectado */}
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-800">Conectado</p>
              <p className="text-sm text-green-600">{status.google_email}</p>
            </div>
          </div>

          {/* Info adicional */}
          <div className="text-sm text-gray-500">
            <p>
              <strong>Calendario:</strong> {status.calendar_id === 'primary' ? 'Principal' : status.calendar_id}
            </p>
            {status.connected_at && (
              <p>
                <strong>Conectado el:</strong>{' '}
                {new Date(status.connected_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* Funcionalidades */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Con Google Calendar conectado puedes:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Añadir órdenes de trabajo a tu calendario
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Sincronizar citas automáticamente
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Recibir recordatorios en tu móvil
              </li>
            </ul>
          </div>

          {/* Botón desconectar */}
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="w-full gap-2 text-red-600 hover:bg-red-50 border-red-200"
          >
            {disconnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            Desconectar Google Calendar
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Estado desconectado */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-700">No conectado</p>
              <p className="text-sm text-gray-500">Conecta tu cuenta de Google para sincronizar</p>
            </div>
          </div>

          {/* Beneficios */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 mb-2">
              Conecta Google Calendar para:
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Ver órdenes y citas en tu calendario</li>
              <li>• Recibir notificaciones automáticas</li>
              <li>• Sincronizar con tu móvil</li>
            </ul>
          </div>

          {/* Botón conectar */}
          <Button
            onClick={handleConnect}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"/>
            </svg>
            Conectar con Google
            <ExternalLink className="w-4 h-4" />
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Se te redirigirá a Google para autorizar el acceso
          </p>
        </div>
      )}
    </Card>
  )
}
