/**
 * @fileoverview Siguiente número de orden de trabajo (OR-0001, OR-0002…)
 * @description Mismo formato que el asistente de nueva orden. Desde 10000
 * no trunca (OR-10000). Si el último número no sigue el formato, empieza en 1.
 */

export function siguienteNumeroOrden(ultimo?: string | null): string {
  const match = ultimo?.match(/OR-(\d+)/)
  const siguiente = match ? parseInt(match[1], 10) + 1 : 1
  return `OR-${siguiente.toString().padStart(4, '0')}`
}
