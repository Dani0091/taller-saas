'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, Check, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface GoogleCalendarButtonProps {
  ordenId: string
  titulo: string
  descripcion?: string
  fechaEntrega?: string | Date | null
  clienteNombre?: string
  vehiculoInfo?: string
}

export function GoogleCalendarButton({
  ordenId,
  titulo,
  descripcion,
  fechaEntrega,
  clienteNombre,
  vehiculoInfo
}: GoogleCalendarButtonProps) {
  const [status, setStatus] = useState<'loading' | 'disconnected' | 'ready' | 'synced'>('loading')
  const [syncing, setSyncing] = useState(false)
  const [eventLink, setEventLink] = useState<string | null>(null)

  useEffect(() => {
    checkStatus()
  }, [ordenId])

  const checkStatus = async () => {
    try {
      // Verificar si Google Calendar está conectado
      const statusRes = await fetch('/api/calendar/google/status')
      const statusData = await statusRes.json()

      if (!statusData.connected) {
        setStatus('disconnected')
        return
      }

      // Verificar si ya existe un evento para esta orden
      const eventRes = await fetch(`/api/calendar/google/events?tipo=orden&id=${ordenId}`)
      const eventData = await eventRes.json()

      if (eventData.synced) {
        setStatus('synced')
        setEventLink(eventData.google_event_link)
      } else {
        setStatus('ready')
      }
    } catch (error) {
      console.error('Error verificando estado:', error)
      setStatus('disconnected')
    }
  }

  const handleSync = async () => {
    if (!fechaEntrega) {
      toast.error('Establece una fecha de entrega para añadir al calendario')
      return
    }

    setSyncing(true)
    try {
      // Construir descripción del evento
      const eventDesc = [
        descripcion,
        clienteNombre && `Cliente: ${clienteNombre}`,
        vehiculoInfo && `Vehículo: ${vehiculoInfo}`,
      ].filter(Boolean).join('\n')

      const res = await fetch('/api/calendar/google/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: `🔧 ${titulo}`,
          descripcion: eventDesc,
          fecha_inicio: typeof fechaEntrega === 'string' ? fechaEntrega : fechaEntrega.toISOString(),
          todo_el_dia: true,
          tipo_referencia: 'orden',
          referencia_id: ordenId,
        })
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.existing) {
          toast.info('Esta orden ya está en tu calendario')
          setStatus('synced')
        } else {
          throw new Error(data.error)
        }
        return
      }

      setStatus('synced')
      setEventLink(data.event_link)
      toast.success('Orden añadida a Google Calendar')
    } catch (error: any) {
      console.error('Error sincronizando:', error)
      toast.error(error.message || 'Error añadiendo al calendario')
    } finally {
      setSyncing(false)
    }
  }

  if (status === 'loading') {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2 text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
        Calendario
      </Button>
    )
  }

  if (status === 'disconnected') {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs text-gray-400"
        title="Conecta Google Calendar en Configuración"
        onClick={() => toast.info('Conecta Google Calendar en Configuración')}
      >
        <Calendar className="w-3 h-3" />
        Calendario
      </Button>
    )
  }

  if (status === 'synced') {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs text-green-600 border-green-200 bg-green-50"
        onClick={() => eventLink && window.open(eventLink, '_blank')}
      >
        <Check className="w-3 h-3" />
        En calendario
        <ExternalLink className="w-3 h-3" />
      </Button>
    )
  }

  // status === 'ready'
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={syncing || !fechaEntrega}
      className="gap-2 text-xs"
      title={!fechaEntrega ? 'Establece una fecha de entrega primero' : 'Añadir a Google Calendar'}
    >
      {syncing ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Calendar className="w-3 h-3" />
      )}
      {syncing ? 'Añadiendo...' : 'Añadir al calendario'}
    </Button>
  )
}
