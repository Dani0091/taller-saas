'use client'

import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface WhatsAppCitaProps {
  telefono: string
  cita: {
    titulo: string
    fecha_inicio: string
    fecha_fin?: string | null
    todo_el_dia?: boolean
    descripcion?: string | null
  }
  nombreTaller?: string
  direccionTaller?: string
}

export function WhatsAppCita({
  telefono,
  cita,
  nombreTaller = 'Nuestro taller',
  direccionTaller
}: WhatsAppCitaProps) {
  if (!telefono) return null

  const numero = telefono.replace(/\D/g, '')
  // Añadir código de país si no lo tiene
  const numeroCompleto = numero.startsWith('34') ? numero : `34${numero}`

  const handleClick = () => {
    const fechaInicio = new Date(cita.fecha_inicio)

    // Formatear fecha y hora
    const fechaFormateada = format(fechaInicio, "EEEE d 'de' MMMM", { locale: es })
    const horaFormateada = cita.todo_el_dia
      ? 'durante todo el día'
      : `a las ${format(fechaInicio, 'HH:mm', { locale: es })}`

    // Crear mensaje
    let mensaje = `🗓️ *Recordatorio de Cita*\n\n`
    mensaje += `Hola, le recordamos su cita en *${nombreTaller}*:\n\n`
    mensaje += `📌 *${cita.titulo}*\n`
    mensaje += `📅 ${fechaFormateada} ${horaFormateada}\n`

    if (direccionTaller) {
      mensaje += `📍 ${direccionTaller}\n`
    }

    if (cita.descripcion) {
      mensaje += `\n📝 ${cita.descripcion}\n`
    }

    mensaje += `\n¿Puede confirmar su asistencia? Responda *SÍ* para confirmar o *NO* si necesita cambiar la fecha.`
    mensaje += `\n\n_Mensaje enviado desde TallerAgil_`

    const mensajeCodificado = encodeURIComponent(mensaje)
    const url = `https://wa.me/${numeroCompleto}?text=${mensajeCodificado}`
    window.open(url, '_blank')
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      className="gap-2 bg-green-500 hover:bg-green-600"
    >
      <MessageCircle className="w-4 h-4" />
      Enviar por WhatsApp
    </Button>
  )
}

/**
 * Genera solo el enlace de WhatsApp sin botón
 */
export function generarEnlaceWhatsAppCita(
  telefono: string,
  cita: {
    titulo: string
    fecha_inicio: string
    todo_el_dia?: boolean
    descripcion?: string | null
  },
  nombreTaller: string = 'Nuestro taller'
): string | null {
  if (!telefono) return null

  const numero = telefono.replace(/\D/g, '')
  const numeroCompleto = numero.startsWith('34') ? numero : `34${numero}`

  const fechaInicio = new Date(cita.fecha_inicio)
  const fechaFormateada = format(fechaInicio, "EEEE d 'de' MMMM", { locale: es })
  const horaFormateada = cita.todo_el_dia
    ? 'durante todo el día'
    : `a las ${format(fechaInicio, 'HH:mm', { locale: es })}`

  let mensaje = `🗓️ *Recordatorio de Cita*\n\n`
  mensaje += `Hola, le recordamos su cita en *${nombreTaller}*:\n\n`
  mensaje += `📌 *${cita.titulo}*\n`
  mensaje += `📅 ${fechaFormateada} ${horaFormateada}\n`

  if (cita.descripcion) {
    mensaje += `\n📝 ${cita.descripcion}\n`
  }

  mensaje += `\n¿Puede confirmar su asistencia?`

  return `https://wa.me/${numeroCompleto}?text=${encodeURIComponent(mensaje)}`
}
