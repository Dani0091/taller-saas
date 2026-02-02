/**
 * @fileoverview Domain Logic: Generar Número de Orden
 * @description Lógica pura para generación de números de orden
 *
 * REGLAS DE NEGOCIO:
 * - Formato: ORD-YYYY-NNNNNN (ej. ORD-2026-000123)
 * - Secuencial por año
 * - Se resetea cada año
 *
 * VENTAJA: Si mañana cambias el formato, solo modificas ESTA función
 */

/**
 * Genera un número de orden basado en el año y el contador
 */
export function generarNumeroOrden(año: number, contador: number): string {
  // Validar año
  const añoActual = new Date().getFullYear()
  if (año < 2000 || año > añoActual + 1) {
    throw new Error(`Año inválido: ${año}`)
  }

  // Validar contador
  if (contador < 1 || contador > 999999) {
    throw new Error(`Contador fuera de rango: ${contador}`)
  }

  // Formatear contador con 6 dígitos (padding con ceros)
  const contadorFormateado = contador.toString().padStart(6, '0')

  return `ORD-${año}-${contadorFormateado}`
}

/**
 * Extrae el año y contador de un número de orden
 */
export function parseNumeroOrden(numeroOrden: string): {
  año: number
  contador: number
} | null {
  const regex = /^ORD-(\d{4})-(\d{6})$/
  const match = numeroOrden.match(regex)

  if (!match) {
    return null
  }

  return {
    año: parseInt(match[1], 10),
    contador: parseInt(match[2], 10)
  }
}

/**
 * Verifica si un número de orden es válido
 */
export function isNumeroOrdenValido(numeroOrden: string): boolean {
  return parseNumeroOrden(numeroOrden) !== null
}

/**
 * Genera el siguiente número de orden
 */
export function generarSiguienteNumero(
  ultimoNumero?: string
): string {
  const añoActual = new Date().getFullYear()

  if (!ultimoNumero) {
    // Primera orden del taller
    return generarNumeroOrden(añoActual, 1)
  }

  const parsed = parseNumeroOrden(ultimoNumero)

  if (!parsed) {
    // Si el último número es inválido, empezar desde 1
    return generarNumeroOrden(añoActual, 1)
  }

  // Si cambió el año, resetear contador
  if (parsed.año !== añoActual) {
    return generarNumeroOrden(añoActual, 1)
  }

  // Incrementar contador
  return generarNumeroOrden(añoActual, parsed.contador + 1)
}
