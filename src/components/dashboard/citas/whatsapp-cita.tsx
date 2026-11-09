'use client'

import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { enlaceWhatsAppCita, type CitaCompartible, type DatosCompartir } from '@/lib/citas/compartir'

interface WhatsAppCitaProps {
  telefono: string
  /** Fechas como instante ISO (no la hora local del formulario). */
  cita: CitaCompartible
  datos?: DatosCompartir
}

/** Abre WhatsApp con la cita y el enlace para añadirla al Google Calendar del cliente. */
export function WhatsAppCita({ telefono, cita, datos }: WhatsAppCitaProps) {
  if (!telefono) return null

  return (
    <Button
      type="button"
      onClick={() => window.open(enlaceWhatsAppCita(telefono, cita, datos), '_blank', 'noopener,noreferrer')}
      className="gap-2 bg-success hover:bg-success/90"
    >
      <MessageCircle className="w-4 h-4" aria-hidden="true" />
      Enviar por WhatsApp
    </Button>
  )
}
