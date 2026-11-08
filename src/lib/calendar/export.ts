/**
 * Utilidades para exportar citas a calendarios externos
 * Soporta: Google Calendar, Outlook, ICS (para Apple Calendar, etc.)
 *
 * Las horas viajan siempre como instante UTC; los días completos se calculan
 * en hora de Madrid. Así el resultado no depende de la zona del equipo que
 * genera el enlace ni del que lo abre.
 */

interface CitaExport {
  titulo: string
  descripcion?: string
  fecha_inicio: string // ISO string
  fecha_fin?: string | null
  todo_el_dia?: boolean
  ubicacion?: string
}

const ZONA = 'Europe/Madrid'
const UNA_HORA = 60 * 60 * 1000

/** Rango del evento. Sin fin válido (o fin ≤ inicio) dura una hora. */
export interface Rango {
  inicio: Date
  fin: Date
  /** Solo en todo el día: primer día y día siguiente al último (fin exclusivo), YYYYMMDD. */
  primerDia: string
  diaTrasUltimo: string
}

export function rangoCita(cita: Pick<CitaExport, 'fecha_inicio' | 'fecha_fin'>): Rango {
  const inicio = new Date(cita.fecha_inicio)
  const finLeido = cita.fecha_fin ? new Date(cita.fecha_fin) : null
  const fin = finLeido && finLeido.getTime() > inicio.getTime() ? finLeido : new Date(inicio.getTime() + UNA_HORA)
  const primerDia = diaEnMadrid(inicio)
  // El día de fin que eligió el usuario cuenta como incluido.
  const ultimoDia = finLeido && finLeido > inicio ? diaEnMadrid(finLeido) : primerDia
  return { inicio, fin, primerDia, diaTrasUltimo: diaSiguiente(ultimoDia >= primerDia ? ultimoDia : primerDia) }
}

/** YYYYMMDDTHHMMSSZ */
function utc(fecha: Date): string {
  return fecha.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Genera un enlace para añadir un evento a Google Calendar
 */
export function generarEnlaceGoogleCalendar(cita: CitaExport): string {
  const r = rangoCita(cita)
  // Todo el día: YYYYMMDD con fin EXCLUSIVO (el día siguiente al último).
  const dates = cita.todo_el_dia ? `${r.primerDia}/${r.diaTrasUltimo}` : `${utc(r.inicio)}/${utc(r.fin)}`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: cita.titulo,
    dates,
    details: cita.descripcion || '',
    location: cita.ubicacion || '',
    // Las horas van en UTC (sufijo Z); ctz fija la zona con la que Google las muestra.
    ctz: ZONA
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Genera un enlace para añadir un evento a Outlook
 */
export function generarEnlaceOutlook(cita: CitaExport): string {
  const r = rangoCita(cita)
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: cita.todo_el_dia ? isoDia(r.primerDia) : r.inicio.toISOString(),
    enddt: cita.todo_el_dia ? isoDia(r.diaTrasUltimo) : r.fin.toISOString(),
    subject: cita.titulo,
    body: cita.descripcion || '',
    location: cita.ubicacion || ''
  })
  if (cita.todo_el_dia) params.set('allday', 'true')

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/** Bloque VEVENT de una cita. */
function vevent(cita: CitaExport, dtstamp: string): string[] {
  const r = rangoCita(cita)
  const lineas = [
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).slice(2, 11)}@talleragil.com`,
    `DTSTAMP:${dtstamp}`,
  ]

  if (cita.todo_el_dia) {
    lineas.push(`DTSTART;VALUE=DATE:${r.primerDia}`, `DTEND;VALUE=DATE:${r.diaTrasUltimo}`)
  } else {
    lineas.push(`DTSTART:${utc(r.inicio)}`, `DTEND:${utc(r.fin)}`)
  }

  lineas.push(`SUMMARY:${escaparICS(cita.titulo)}`)
  if (cita.descripcion) lineas.push(`DESCRIPTION:${escaparICS(cita.descripcion)}`)
  if (cita.ubicacion) lineas.push(`LOCATION:${escaparICS(cita.ubicacion)}`)
  lineas.push('END:VEVENT')
  return lineas
}

function calendario(eventos: string[][], extra: string[] = []): string {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TallerAgil//Citas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...extra,
    ...eventos.flat(),
    'END:VCALENDAR',
  ]
  return lineas.join('\r\n') + '\r\n'
}

/**
 * Genera contenido ICS para una cita
 */
export function generarICS(cita: CitaExport): string {
  return calendario([vevent(cita, utc(new Date()))])
}

/**
 * Genera ICS para múltiples citas
 */
export function generarICSMultiple(citas: CitaExport[]): string {
  const ahora = utc(new Date())
  return calendario(citas.map((c) => vevent(c, ahora)), ['X-WR-CALNAME:Citas TallerAgil'])
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
    .replace(/\r?\n/g, '\\n')
}

/** Día (YYYYMMDD) de una fecha en hora de Madrid, sin depender de la zona del equipo. */
function diaEnMadrid(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha)
  return partes.replace(/-/g, '')
}

/** YYYYMMDD → día siguiente en YYYYMMDD. */
function diaSiguiente(dia: string): string {
  const d = new Date(Date.UTC(+dia.slice(0, 4), +dia.slice(4, 6) - 1, +dia.slice(6, 8) + 1))
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

/** YYYYMMDD → YYYY-MM-DD */
export function isoDia(dia: string): string {
  return `${dia.slice(0, 4)}-${dia.slice(4, 6)}-${dia.slice(6, 8)}`
}
