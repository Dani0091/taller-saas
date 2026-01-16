'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Loader2, Save, Eye, EyeOff, ExternalLink, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'

interface GoogleApiConfig {
  google_client_id?: string
  google_client_secret?: string
}

interface Props {
  tallerId: string
  onConfigured?: () => void
}

export function GoogleCalendarConfig({ tallerId, onConfigured }: Props) {
  const [config, setConfig] = useState<GoogleApiConfig>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [tallerId])

  const fetchConfig = async () => {
    try {
      const res = await fetch(`/api/configuracion/api-keys?taller_id=${tallerId}`)
      if (res.ok) {
        const data = await res.json()
        setConfig({
          google_client_id: data.google_client_id || '',
          google_client_secret: data.google_client_secret ? '********' : '',
        })
      }
    } catch (error) {
      console.error('Error obteniendo configuración:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config.google_client_id?.trim()) {
      toast.error('El Client ID es requerido')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/configuracion/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taller_id: tallerId,
          google_client_id: config.google_client_id.trim(),
          // Solo enviar secret si se ha cambiado (no es ******)
          ...(config.google_client_secret && !config.google_client_secret.includes('*')
            ? { google_client_secret: config.google_client_secret.trim() }
            : {})
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error guardando')
      }

      toast.success('Credenciales de Google guardadas')
      onConfigured?.()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Cargando configuración...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">Credenciales de Google</h4>
          <p className="text-xs text-gray-500">
            Configura tus propias credenciales de Google para usar Calendar
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHelp(!showHelp)}
          className="gap-1 text-xs"
        >
          <HelpCircle className="w-4 h-4" />
          Ayuda
        </Button>
      </div>

      {showHelp && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h5 className="font-medium text-blue-800 mb-2 text-sm">Como obtener las credenciales:</h5>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Ve a <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
            <li>Crea un nuevo proyecto o selecciona uno existente</li>
            <li>Habilita la API de Google Calendar</li>
            <li>Crea credenciales OAuth 2.0 (tipo "Aplicación web")</li>
            <li>Añade como URI de redirección: <code className="bg-blue-100 px-1 rounded text-xs">{typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/google/callback</code></li>
            <li>Copia el Client ID y Client Secret aquí</li>
          </ol>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
          >
            Abrir Google Cloud Console
            <ExternalLink className="w-3 h-3" />
          </a>
        </Card>
      )}

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-gray-600 mb-1 block">Client ID</Label>
          <Input
            value={config.google_client_id || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, google_client_id: e.target.value }))}
            placeholder="123456789.apps.googleusercontent.com"
            className="font-mono text-xs"
          />
        </div>

        <div>
          <Label className="text-xs text-gray-600 mb-1 block">Client Secret</Label>
          <div className="relative">
            <Input
              type={showSecret ? 'text' : 'password'}
              value={config.google_client_secret || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, google_client_secret: e.target.value }))}
              placeholder="GOCSPX-..."
              className="font-mono text-xs pr-10"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full gap-2 bg-green-600 hover:bg-green-700"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Guardar credenciales
        </Button>
      </div>
    </div>
  )
}
