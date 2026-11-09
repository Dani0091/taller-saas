/**
 * @fileoverview Hora de fin de una cita
 * @description El formulario la presenta como opcional, pero el dominio
 * (Cita.entity) exige un fin posterior al inicio en citas con horario. Un solo
 * registro que no lo cumpla hacía fallar la carga de todo el calendario.
 * Regla única: si no es "todo el día" y falta el fin (o no es posterior al
 * inicio), la cita dura 1 hora.
 */

export const DURACION_POR_DEFECTO_MS = 60 * 60 * 1000

/**
 * ¿El fin es anterior al inicio? (p. ej. empieza el 09/11 y "termina" el 08/11)
 * Igual al inicio no es error: se lee como cita de 1 hora. Valores vacíos o
 * no interpretables no se consideran error aquí.
 */
export function finAnteriorAInicio(fechaInicio: unknown, fechaFin: unknown): boolean {
  if (typeof fechaInicio !== 'string' || typeof fechaFin !== 'string' || !fechaInicio || !fechaFin) return false
  const inicio = new Date(fechaInicio).getTime()
  const fin = new Date(fechaFin).getTime()
  return Number.isFinite(inicio) && Number.isFinite(fin) && fin < inicio
}

export const ERROR_FIN_ANTERIOR = 'La hora de fin no puede ser anterior al inicio'

/** Fin efectivo para el dominio (lectura). No toca la base de datos. */
export function fechaFinEfectiva(
  fechaInicio: Date,
  fechaFin: Date | undefined,
  todoElDia: boolean
): Date | undefined {
  if (todoElDia) return fechaFin
  if (Number.isNaN(fechaInicio.getTime())) return fechaFin
  if (fechaFin && fechaFin.getTime() > fechaInicio.getTime()) return fechaFin
  return new Date(fechaInicio.getTime() + DURACION_POR_DEFECTO_MS)
}

const SIN_ZONA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/

/**
 * Fin a guardar (escritura). El formulario envía horas sin zona
 * ("2026-11-15T10:00") y Postgres las guarda tal cual: se suma 1 hora sin
 * cambiar de zona, para que el fin quede siempre 1 hora después del inicio.
 */
export function fechaFinParaGuardar(
  fechaInicio: unknown,
  fechaFin: unknown,
  todoElDia: unknown
): string | null {
  if (typeof fechaFin === 'string' && fechaFin) return fechaFin
  if (todoElDia === true || typeof fechaInicio !== 'string') return null

  if (SIN_ZONA.test(fechaInicio)) {
    const comoUtc = new Date(fechaInicio + 'Z')
    if (Number.isNaN(comoUtc.getTime())) return null
    return new Date(comoUtc.getTime() + DURACION_POR_DEFECTO_MS).toISOString().slice(0, 19)
  }

  const inicio = new Date(fechaInicio)
  if (Number.isNaN(inicio.getTime())) return null
  return new Date(inicio.getTime() + DURACION_POR_DEFECTO_MS).toISOString()
}
