import { describe, it, expect } from 'vitest'
import { describirCuando, mensajeCita, enlaceWhatsAppCita } from './compartir'
import { generarEnlaceGoogleCalendar } from '@/lib/calendar/export'

// 09:00 de Madrid el sábado 15-11-2026 (UTC+1) = 08:00Z
const CITA = { titulo: 'Revisión ITV', fecha_inicio: '2026-11-15T08:00:00.000Z', fecha_fin: '2026-11-15T09:30:00.000Z' }

describe('describirCuando', () => {
  it('franja en hora de Madrid', () => {
    expect(describirCuando(CITA)).toBe('domingo 15 de noviembre de 09:00 a 10:30')
  })
  it('sin fin → "a las"', () => {
    expect(describirCuando({ ...CITA, fecha_fin: null })).toBe('domingo 15 de noviembre a las 09:00')
  })
  it('todo el día', () => {
    expect(describirCuando({ ...CITA, todo_el_dia: true })).toBe('domingo 15 de noviembre, durante todo el día')
  })
  it('horario de verano (UTC+2)', () => {
    expect(describirCuando({ titulo: 'x', fecha_inicio: '2026-07-15T16:30:00.000Z' })).toBe('miércoles 15 de julio a las 18:30')
  })
  it('fecha inválida → vacío', () => {
    expect(describirCuando({ titulo: 'x', fecha_inicio: 'no' })).toBe('')
  })
})

describe('mensajeCita', () => {
  const m = mensajeCita({ ...CITA, descripcion: 'Traer documentación' }, {
    nombreTaller: 'Taller QA', direccionTaller: 'Calle Falsa 1, Madrid', nombreCliente: 'Ana', vehiculo: 'Seat Ibiza 0000QAA',
  })
  it('incluye todos los datos', () => {
    for (const t of ['*Cita en Taller QA*', 'Hola Ana', '*Revisión ITV*', 'de 09:00 a 10:30', '🚗 Seat Ibiza 0000QAA', '📍 Calle Falsa 1, Madrid', '📝 Traer documentación', 'Responda *SÍ* o *NO*']) {
      expect(m).toContain(t)
    }
  })
  it('incluye el enlace de Google Calendar con las horas exactas', () => {
    expect(m).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE')
    expect(m).toContain('dates=20261115T080000Z%2F20261115T093000Z')
    expect(m).toContain('ctz=Europe%2FMadrid')
  })
  it('sin datos opcionales no deja líneas vacías raras', () => {
    const corto = mensajeCita({ titulo: 'Cambio aceite', fecha_inicio: CITA.fecha_inicio })
    expect(corto).toContain('*Cita en nuestro taller*')
    expect(corto).not.toContain('undefined')
    expect(corto).not.toContain('🚗')
  })
})

describe('enlace de Google Calendar: todo el día', () => {
  it('fin exclusivo (día siguiente) y día en hora de Madrid', () => {
    // medianoche de Madrid guardada como 23:00Z del día anterior
    const url = generarEnlaceGoogleCalendar({ titulo: 'ITV', fecha_inicio: '2026-11-14T23:00:00.000Z', todo_el_dia: true })
    expect(decodeURIComponent(url)).toContain('dates=20261115/20261116')
  })
  it('varios días', () => {
    const url = generarEnlaceGoogleCalendar({ titulo: 'Taller cerrado', fecha_inicio: '2026-12-23T23:00:00.000Z', fecha_fin: '2026-12-25T23:00:00.000Z', todo_el_dia: true })
    expect(decodeURIComponent(url)).toContain('dates=20261224/20261227')
  })
})

describe('enlaceWhatsAppCita', () => {
  it('número con prefijo y mensaje codificado', () => {
    const url = enlaceWhatsAppCita('600 123 456', CITA, { nombreTaller: 'Taller QA' })
    expect(url.startsWith('https://wa.me/34600123456?text=')).toBe(true)
    expect(decodeURIComponent(url.split('?text=')[1])).toContain('*Revisión ITV*')
  })
})
