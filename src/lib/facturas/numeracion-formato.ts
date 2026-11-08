/**
 * @fileoverview Formato y validación del número de factura devuelto por la RPC
 * @description Lógica pura (sin Supabase) usada por numeracion.ts.
 *
 * Contexto (ver docs/plan/PLAN_GRAFO.md, nodo NUM-01):
 * - La v3 instalada en producción devuelve { prefijo, numero, numero_completo }
 *   con formato PREFIJO-NNN (sin año) y LPAD(numero, 3): desde 1000 TRUNCA
 *   ('1000' → '100') y repetiría números ya emitidos.
 * - La v3 del repo (migración 20260225) y la propuesta v4 añaden `año` y usan
 *   PREFIJO-AAAA-NNN.
 * Aquí se reconstruye numero_completo a partir de `numero` (entero, nunca
 * truncado), respetando el formato que devuelva cada versión. Por debajo de
 * 1000 el resultado es idéntico al de la RPC; si no lo es, se rechaza.
 */

/** Umbral desde el que LPAD(x, 3) trunca. */
export const LIMITE_LPAD = 1000

/** Rellena a 3 dígitos como mínimo, sin truncar nunca: 8 → 008, 1000 → 1000. */
export function formatearSecuencial(numero: number): string {
  return String(numero).padStart(3, '0')
}

/** PREFIJO-NNN, o PREFIJO-AAAA-NNN si la RPC devuelve año. */
export function construirNumeroCompleto(prefijo: string, numero: number, año?: number): string {
  const sec = formatearSecuencial(numero)
  return año === undefined ? `${prefijo}-${sec}` : `${prefijo}-${año}-${sec}`
}

export type RespuestaNumeracion =
  | { valido: true; numeroCompleto: string; numero: number; corregidoTruncado: boolean }
  | { valido: false; motivo: string }

/**
 * Valida la respuesta de la RPC y devuelve el número definitivo.
 * - Falta numero/prefijo, o numero no es entero positivo → inválido.
 * - numero < 1000 y numero_completo no coincide con lo esperado → inválido
 *   (la RPC cambió de formato sin que el código lo sepa: mejor parar).
 * - numero ≥ 1000 → se usa el reconstruido; corregidoTruncado indica si la
 *   RPC devolvió un valor truncado.
 */
export function interpretarRespuestaNumeracion(data: unknown): RespuestaNumeracion {
  if (!data || typeof data !== 'object') {
    return { valido: false, motivo: 'La RPC no devolvió un objeto' }
  }

  const { prefijo, numero, año, numero_completo } = data as Record<string, unknown>

  if (typeof prefijo !== 'string' || prefijo.trim() === '') {
    return { valido: false, motivo: 'La RPC no devolvió prefijo' }
  }
  if (typeof numero !== 'number' || !Number.isInteger(numero) || numero < 1) {
    return { valido: false, motivo: 'La RPC no devolvió un número entero positivo' }
  }
  if (año !== undefined && año !== null && (typeof año !== 'number' || !Number.isInteger(año))) {
    return { valido: false, motivo: 'La RPC devolvió un año no válido' }
  }

  const esperado = construirNumeroCompleto(prefijo, numero, typeof año === 'number' ? año : undefined)

  if (numero < LIMITE_LPAD) {
    if (numero_completo !== esperado) {
      return {
        valido: false,
        motivo: `Formato inesperado de la RPC: "${String(numero_completo)}" (esperado "${esperado}")`,
      }
    }
    return { valido: true, numeroCompleto: esperado, numero, corregidoTruncado: false }
  }

  return { valido: true, numeroCompleto: esperado, numero, corregidoTruncado: numero_completo !== esperado }
}
