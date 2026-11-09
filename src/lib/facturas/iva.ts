/**
 * @fileoverview Porcentaje de IVA leído de formularios, BD o configuración
 * @description `valor || 21` convertía un 0 % (exento) en 21 %, porque 0 es
 * falsy. Aquí 0 es un valor válido; solo lo vacío o inválido usa el defecto.
 */

/** % de IVA si es un número entre 0 y 100; si no, `porDefecto`. */
export function porcentajeIva(valor: unknown, porDefecto = 21): number {
  if (valor === null || valor === undefined || valor === '') return porDefecto
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'))
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : porDefecto
}

/** % de la cabecera: el de las líneas si todas coinciden; si no, `porDefecto`. */
export function porcentajeIvaCabecera(porcentajesLineas: number[], porDefecto: number): number {
  const unicos = new Set(porcentajesLineas)
  return unicos.size === 1 ? porcentajesLineas[0] : porDefecto
}
