/**
 * @fileoverview Mensaje de WhatsApp de una cita, con enlace a Google Calendar
 * @description Única fuente del texto que recibe el cliente. Las fechas se
 * formatean siempre en hora de Madrid (no dependen del equipo que lo genere).
 */

import { generarEnlaceGoogleCalendar } from '@/lib/calendar/export'
import { enlaceWhatsApp } from '@/lib/compartir/whatsapp'

export const ZONA_TALLER = 'Europe/Madrid'

export interface CitaCompartible {
  titulo: string
  fecha_inicio: string
  fecha_fin?: string | null
  todo_el_dia?: boolean
  descripcion?: string | null
}

export interface DatosCompartir {
  nombreTaller?: string
  direccionTaller?: string
  nombreCliente?: string
  vehiculo?: string
}

const fechaLarga = new Intl.DateTimeFormat('es-ES', { timeZone: ZONA_TALLER, weekday: 'long', day: 'numeric', month: 'long' })
const hora = new Intl.DateTimeFormat('es-ES', { timeZone: ZONA_TALLER, hour: '2-digit', minute: '2-digit' })

/** "sábado 15 de noviembre a las 09:00" (o "durante todo el día"). */
export function describirCuando(cita: CitaCompartible): string {
  const inicio = new Date(cita.fecha_inicio)
  if (Number.isNaN(inicio.getTime())) return ''
  const dia = fechaLarga.format(inicio).replace(',', '')
  if (cita.todo_el_dia) return `${dia}, durante todo el día`
  const fin = cita.fecha_fin ? new Date(cita.fecha_fin) : null
  const tramo = fin && fin > inicio ? `de ${hora.format(inicio)} a ${hora.format(fin)}` : `a las ${hora.format(inicio)}`
  return `${dia} ${tramo}`
}

/** Texto completo para el cliente, con el enlace para añadirla a su calendario. */
export function mensajeCita(cita: CitaCompartible, datos: DatosCompartir = {}): string {
  const taller = datos.nombreTaller || 'nuestro taller'
  const lineas = [
    `🗓️ *Cita en ${taller}*`,
    '',
    `Hola${datos.nombreCliente ? ` ${datos.nombreCliente}` : ''}, le confirmamos su cita:`,
    '',
    `📌 *${cita.titulo}*`,
    `📅 ${describirCuando(cita)}`,
  ]
  if (datos.vehiculo) lineas.push(`🚗 ${datos.vehiculo}`)
  if (datos.direccionTaller) lineas.push(`📍 ${datos.direccionTaller}`)
  if (cita.descripcion) lineas.push('', `📝 ${cita.descripcion}`)

  const enlace = generarEnlaceGoogleCalendar({
    titulo: `${cita.titulo} · ${taller}`,
    descripcion: cita.descripcion || undefined,
    fecha_inicio: cita.fecha_inicio,
    fecha_fin: cita.fecha_fin,
    todo_el_dia: cita.todo_el_dia,
    ubicacion: datos.direccionTaller,
  })
  lineas.push('', `➕ Añádala a su calendario: ${enlace}`, '', '¿Puede confirmar su asistencia? Responda *SÍ* o *NO*.')
  return lineas.join('\n')
}

export function enlaceWhatsAppCita(telefono: string | null | undefined, cita: CitaCompartible, datos: DatosCompartir = {}): string {
  return enlaceWhatsApp(telefono, mensajeCita(cita, datos))
}
