/**
 * Utilidades para exportar citas a calendarios externos
 * Soporta: Google Calendar, Outlook, ICS (para Apple Calendar, etc.)
 */

import { format } from 'date-fns'

interface CitaExport {
  titulo: string
  descripcion?: string
  fecha_inicio: string // ISO string
  fecha_fin?: string | null
  todo_el_dia?: boolean
  ubicacion?: string
}

/**
 * Genera un enlace para añadir un evento a Google Calendar
 */
export function generarEnlaceGoogleCalendar(cita: CitaExport): string {
  const fechaInicio = new Date(cita.fecha_inicio)
  const fechaFin = cita.fecha_fin
    ? new Date(cita.fecha_fin)
    : new Date(fechaInicio.getTime() + 60 * 60 * 1000) // +1 hora por defecto

  // Formato requerido por Google: YYYYMMDDTHHMMSSZ (para todo el día: YYYYMMDD)
  const formatoGoogle = (fecha: Date, todoElDia: boolean) => {
    if (todoElDia) {
      return format(fecha, 'yyyyMMdd')
    }
    return fecha.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: cita.titulo,
    dates: `${formatoGoogle(fechaInicio, !!cita.todo_el_dia)}/${formatoGoogle(fechaFin, !!cita.todo_el_dia)}`,
    details: cita.descripcion || '',
    location: cita.ubicacion || ''
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Genera un enlace para añadir un evento a Outlook
 */
export function generarEnlaceOutlook(cita: CitaExport): string {
  const fechaInicio = new Date(cita.fecha_inicio)
  const fechaFin = cita.fecha_fin
    ? new Date(cita.fecha_fin)
    : new Date(fechaInicio.getTime() + 60 * 60 * 1000)

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: fechaInicio.toISOString(),
    enddt: fechaFin.toISOString(),
    subject: cita.titulo,
    body: cita.descripcion || '',
    location: cita.ubicacion || ''
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/**
 * Genera contenido ICS para una cita
 */
export function generarICS(cita: CitaExport): string {
  const fechaInicio = new Date(cita.fecha_inicio)
  const fechaFin = cita.fecha_fin
    ? new Date(cita.fecha_fin)
    : new Date(fechaInicio.getTime() + 60 * 60 * 1000)

  const formatoICS = (fecha: Date) => {
    return fecha.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }

  const formatoFechaLocal = (fecha: Date) => {
    return format(fecha, "yyyyMMdd'T'HHmmss")
  }

  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@talleragil.com`
  const ahora = formatoICS(new Date())

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TallerAgil//Citas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${ahora}`,
  ]

  if (cita.todo_el_dia) {
    ics.push(`DTSTART;VALUE=DATE:${format(fechaInicio, 'yyyyMMdd')}`)
    ics.push(`DTEND;VALUE=DATE:${format(fechaFin, 'yyyyMMdd')}`)
  } else {
    ics.push(`DTSTART:${formatoFechaLocal(fechaInicio)}`)
    ics.push(`DTEND:${formatoFechaLocal(fechaFin)}`)
  }

  ics.push(`SUMMARY:${escaparICS(cita.titulo)}`)

  if (cita.descripcion) {
    ics.push(`DESCRIPTION:${escaparICS(cita.descripcion)}`)
  }

  if (cita.ubicacion) {
    ics.push(`LOCATION:${escaparICS(cita.ubicacion)}`)
  }

  ics.push('END:VEVENT')
  ics.push('END:VCALENDAR')

  return ics.join('\r\n')
}

/**
 * Genera ICS para múltiples citas
 */
export function generarICSMultiple(citas: CitaExport[]): string {
  const uid = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@talleragil.com`
  const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TallerAgil//Citas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Citas TallerAgil',
  ]

  for (const cita of citas) {
    const fechaInicio = new Date(cita.fecha_inicio)
    const fechaFin = cita.fecha_fin
      ? new Date(cita.fecha_fin)
      : new Date(fechaInicio.getTime() + 60 * 60 * 1000)

    const formatoFechaLocal = (fecha: Date) => format(fecha, "yyyyMMdd'T'HHmmss")

    ics.push('BEGIN:VEVENT')
    ics.push(`UID:${uid()}`)
    ics.push(`DTSTAMP:${ahora}`)

    if (cita.todo_el_dia) {
      ics.push(`DTSTART;VALUE=DATE:${format(fechaInicio, 'yyyyMMdd')}`)
      ics.push(`DTEND;VALUE=DATE:${format(fechaFin, 'yyyyMMdd')}`)
    } else {
      ics.push(`DTSTART:${formatoFechaLocal(fechaInicio)}`)
      ics.push(`DTEND:${formatoFechaLocal(fechaFin)}`)
    }

    ics.push(`SUMMARY:${escaparICS(cita.titulo)}`)

    if (cita.descripcion) {
      ics.push(`DESCRIPTION:${escaparICS(cita.descripcion)}`)
    }

    if (cita.ubicacion) {
      ics.push(`LOCATION:${escaparICS(cita.ubicacion)}`)
    }

    ics.push('END:VEVENT')
  }

  ics.push('END:VCALENDAR')

  return ics.join('\r\n')
}

/**
 * Descarga un archivo ICS
 */
export function descargarICS(contenido: string, nombreArchivo: string = 'cita.ics') {
  const blob = new Blob([contenido], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Escapa caracteres especiales para formato ICS
 */
function escaparICS(texto: string): string {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}
