import { describe, it, expect } from 'vitest'
import { generarEnlaceGoogleCalendar, generarEnlaceOutlook, generarICS, generarICSMultiple } from './export'

// 09:00–10:30 en Madrid (invierno, UTC+1)
const cita = { titulo: 'Revisión', fecha_inicio: '2026-11-15T08:00:00.000Z', fecha_fin: '2026-11-15T09:30:00.000Z' }
const param = (url: string, k: string) => new URL(url).searchParams.get(k)
const linea = (ics: string, k: string) => ics.split('\r\n').filter((l) => l.startsWith(k))

describe('generarEnlaceGoogleCalendar', () => {
  it('horas en UTC y zona Madrid', () => {
    const url = generarEnlaceGoogleCalendar(cita)
    expect(param(url, 'dates')).toBe('20261115T080000Z/20261115T093000Z')
    expect(param(url, 'ctz')).toBe('Europe/Madrid')
  })

  it('sin fin, o con fin anterior al inicio, dura una hora', () => {
    for (const fecha_fin of [null, '2026-11-15T07:00:00.000Z', '2026-11-15T08:00:00.000Z', 'basura']) {
      expect(param(generarEnlaceGoogleCalendar({ ...cita, fecha_fin }), 'dates')).toBe('20261115T080000Z/20261115T090000Z')
    }
  })

  it('todo el día: fin exclusivo, día de Madrid aunque en UTC sea el día anterior', () => {
    // 00:00 del 15 en Madrid = 23:00 del 14 en UTC
    const dia = { titulo: 'ITV', fecha_inicio: '2026-11-14T23:00:00.000Z', fecha_fin: '2026-11-15T22:59:00.000Z', todo_el_dia: true }
    expect(param(generarEnlaceGoogleCalendar(dia), 'dates')).toBe('20261115/20261116')
    expect(param(generarEnlaceGoogleCalendar({ ...dia, fecha_fin: null }), 'dates')).toBe('20261115/20261116')
    // El día de fin elegido cuenta como incluido (fin 00:00 del 16 → hasta el 16)
    expect(param(generarEnlaceGoogleCalendar({ ...dia, fecha_fin: '2026-11-15T23:00:00.000Z' }), 'dates')).toBe('20261115/20261117')
    // Fin anterior al inicio: un solo día
    expect(param(generarEnlaceGoogleCalendar({ ...dia, fecha_fin: '2026-11-10T10:00:00.000Z' }), 'dates')).toBe('20261115/20261116')
  })

  it('varios días completos', () => {
    const dias = { titulo: 'Taller cerrado', fecha_inicio: '2026-12-23T23:00:00.000Z', fecha_fin: '2026-12-26T10:00:00.000Z', todo_el_dia: true }
    expect(param(generarEnlaceGoogleCalendar(dias), 'dates')).toBe('20261224/20261227')
  })
})

describe('generarEnlaceOutlook', () => {
  it('instantes ISO y, en todo el día, fechas con allday', () => {
    const url = generarEnlaceOutlook(cita)
    expect(param(url, 'startdt')).toBe('2026-11-15T08:00:00.000Z')
    expect(param(url, 'allday')).toBeNull()
    const dia = generarEnlaceOutlook({ ...cita, fecha_inicio: '2026-11-14T23:00:00.000Z', fecha_fin: null, todo_el_dia: true })
    expect([param(dia, 'startdt'), param(dia, 'enddt'), param(dia, 'allday')]).toEqual(['2026-11-15', '2026-11-16', 'true'])
  })
})

describe('generarICS', () => {
  it('horas en UTC (no flotantes) y CRLF', () => {
    const ics = generarICS({ ...cita, descripcion: 'Aceite; filtros, y\nfrenos', ubicacion: 'C/ Mayor, 1' })
    expect(linea(ics, 'DTSTART')).toEqual(['DTSTART:20261115T080000Z'])
    expect(linea(ics, 'DTEND')).toEqual(['DTEND:20261115T093000Z'])
    expect(linea(ics, 'DESCRIPTION')).toEqual(['DESCRIPTION:Aceite\\; filtros\\, y\\nfrenos'])
    expect(linea(ics, 'LOCATION')).toEqual(['LOCATION:C/ Mayor\\, 1'])
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/)
  })

  it('todo el día sin fin: DTEND es el día siguiente, nunca igual a DTSTART', () => {
    const ics = generarICS({ titulo: 'ITV', fecha_inicio: '2026-11-14T23:00:00.000Z', todo_el_dia: true })
    expect(linea(ics, 'DTSTART')).toEqual(['DTSTART;VALUE=DATE:20261115'])
    expect(linea(ics, 'DTEND')).toEqual(['DTEND;VALUE=DATE:20261116'])
  })

  it('varias citas: un VEVENT por cita y UID distintos', () => {
    const ics = generarICSMultiple([cita, { ...cita, titulo: 'Otra' }])
    expect(linea(ics, 'BEGIN:VEVENT')).toHaveLength(2)
    const uids = linea(ics, 'UID:')
    expect(new Set(uids).size).toBe(2)
    expect(linea(ics, 'X-WR-CALNAME')).toHaveLength(1)
  })
})
