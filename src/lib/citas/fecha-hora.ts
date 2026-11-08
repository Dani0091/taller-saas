/**
 * @fileoverview Conversión entre la hora que ve el usuario y el instante guardado
 * @description <input type="datetime-local"> da una hora sin zona
 * ("2026-11-08T09:00"). Enviada así, Postgres (UTC) la guardaba como 09:00 UTC
 * = 10:00 en Madrid (11:00 en verano): las citas aparecían desplazadas.
 * En el navegador se convierte al instante exacto usando su zona horaria.
 */

import { format } from 'date-fns'

/** Hora local del formulario → instante ISO (UTC). Valor vacío o inválido → null. */
export function horaLocalAInstante(valor: string | null | undefined): string | null {
  if (!valor) return null
  const fecha = new Date(valor) // sin zona: se interpreta en la zona del navegador
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString()
}

/** Instante guardado → valor para <input type="datetime-local"> en hora local. */
export function instanteAHoraLocal(instante: string | null | undefined): string {
  if (!instante) return ''
  const fecha = new Date(instante)
  return Number.isNaN(fecha.getTime()) ? '' : format(fecha, "yyyy-MM-dd'T'HH:mm")
}
