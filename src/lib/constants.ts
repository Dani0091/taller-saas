/**
 * @fileoverview Constantes compartidas para TallerAgil
 * @description Valores constantes usados en toda la aplicación
 */

// =============================================================================
// ESTADOS DE ÓRDENES DE REPARACIÓN
// =============================================================================

/**
 * Estados posibles de una orden de reparación
 * Cada estado tiene un valor, etiqueta, color y emoji
 */
// colorId: paleta de Google Calendar (1-11). Referencia: 3=Grape/morado, 5=Banana/amarillo,
// 6=Tangerine/naranja, 7=Peacock/azul, 10=Basil/verde, 11=Tomato/rojo.
export const ESTADOS_ORDEN = [
  { value: 'recibido', label: 'Recibido', color: 'bg-blue-500', icon: '📋', description: 'Vehículo recién ingresado al taller', googleColorId: '7' },
  { value: 'en_diagnostico', label: 'En Diagnóstico', color: 'bg-purple-500', icon: '🔍', description: 'Evaluando el problema del vehículo', googleColorId: '6' },
  { value: 'presupuestado', label: 'Presupuestado', color: 'bg-yellow-500', icon: '💰', description: 'Presupuesto elaborado, pendiente de aprobación', googleColorId: '5' },
  { value: 'aprobado', label: 'Aprobado', color: 'bg-cyan-500', icon: '✓', description: 'Cliente ha aprobado el presupuesto', googleColorId: '5' },
  { value: 'en_progreso', label: 'En Reparación', color: 'bg-amber-500', icon: '🔧', description: 'Trabajo en progreso', googleColorId: '3' },
  { value: 'finalizado', label: 'Finalizado', color: 'bg-green-500', icon: '✅', description: 'Reparación finalizada', googleColorId: '10' },
  { value: 'facturado', label: 'Facturado', color: 'bg-emerald-600', icon: '🚗', description: 'Orden facturada y vehículo entregado', googleColorId: '10' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500', icon: '❌', description: 'Orden cancelada', googleColorId: '11' },
] as const

/** Tipo para los valores de estado de orden */
export type EstadoOrden = typeof ESTADOS_ORDEN[number]['value']

/**
 * Estados que permiten generar factura
 */
export const ESTADOS_FACTURABLES: EstadoOrden[] = ['aprobado', 'en_progreso', 'finalizado', 'facturado']

/**
 * Obtiene la información de un estado por su valor
 * @param valor - Valor del estado
 * @returns Objeto con información del estado o undefined
 */
export function getEstadoOrden(valor: string) {
  return ESTADOS_ORDEN.find(e => e.value === valor)
}

// =============================================================================
// ESTADOS DE FACTURAS
// =============================================================================

/**
 * Estados posibles de una factura
 */
export const ESTADOS_FACTURA = [
  { value: 'borrador', label: 'Borrador', color: 'bg-gray-500', icon: '📝' },
  { value: 'emitida', label: 'Emitida', color: 'bg-blue-500', icon: '📤' },
  { value: 'enviada', label: 'Enviada', color: 'bg-purple-500', icon: '📧' },
  { value: 'pagada', label: 'Pagada', color: 'bg-green-500', icon: '✅' },
  { value: 'vencida', label: 'Vencida', color: 'bg-red-500', icon: '⚠️' },
  { value: 'anulada', label: 'Anulada', color: 'bg-gray-400', icon: '🚫' },
] as const

/** Tipo para los valores de estado de factura */
export type EstadoFactura = typeof ESTADOS_FACTURA[number]['value']

// =============================================================================
// FRACCIONES DE HORA PARA MANO DE OBRA
// =============================================================================

/**
 * Fracciones de hora predefinidas para trabajos de mano de obra
 * Facilita el registro de tiempos en incrementos comunes
 */
export const FRACCIONES_HORA = [
  { value: 0.25, label: '15 min' },
  { value: 0.5, label: '30 min' },
  { value: 0.75, label: '45 min' },
  { value: 1, label: '1 hora' },
  { value: 1.5, label: '1h 30min' },
  { value: 2, label: '2 horas' },
  { value: 2.5, label: '2h 30min' },
  { value: 3, label: '3 horas' },
  { value: 4, label: '4 horas' },
  { value: 5, label: '5 horas' },
  { value: 6, label: '6 horas' },
  { value: 7, label: '7 horas' },
  { value: 8, label: '8 horas' },
  { value: 10, label: '10 horas' },
  { value: 12, label: '12 horas' },
  { value: 16, label: '16 horas' },
  { value: 20, label: '20 horas' },
  { value: 24, label: '24 horas' },
  { value: 30, label: '30 horas' },
  { value: 40, label: '40 horas' },
  { value: 50, label: '50 horas' },
  { value: 60, label: '60 horas' },
  { value: 80, label: '80 horas' },
  { value: 100, label: '100 horas' },
] as const

// =============================================================================
// CANTIDADES PARA PIEZAS/SERVICIOS
// =============================================================================

/**
 * Cantidades predefinidas para piezas y servicios
 */
export const CANTIDADES = [
  { value: 1, label: '1 ud' },
  { value: 2, label: '2 uds' },
  { value: 3, label: '3 uds' },
  { value: 4, label: '4 uds' },
  { value: 5, label: '5 uds' },
  { value: 6, label: '6 uds' },
  { value: 8, label: '8 uds' },
  { value: 10, label: '10 uds' },
  { value: 12, label: '12 uds' },
] as const

// =============================================================================
// TIPOS DE LÍNEA DE ORDEN
// =============================================================================

/**
 * Tipos de líneas que pueden añadirse a una orden
 */
export const TIPOS_LINEA = [
  { value: 'mano_obra', label: '🔧 Mano de obra', unidad: 'horas' },
  { value: 'pieza', label: '⚙️ Recambio / Pieza', unidad: 'unidades' },
  { value: 'servicio', label: '🛠️ Servicio externo', unidad: 'unidades' },
] as const

/** Tipo para los valores de tipo de línea */
export type TipoLinea = typeof TIPOS_LINEA[number]['value']

// =============================================================================
// MÉTODOS DE PAGO
// =============================================================================

/**
 * Métodos de pago disponibles
 */
export const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'bizum', label: 'Bizum' },
  { value: 'domiciliacion', label: 'Domiciliación bancaria' },
] as const

// =============================================================================
// TIPOS DE CLIENTE
// =============================================================================

/**
 * Tipos de cliente
 */
export const TIPOS_CLIENTE = [
  { value: 'particular', label: 'Particular' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'autonomo', label: 'Autónomo' },
  { value: 'flota', label: 'Flota' },
] as const

// =============================================================================
// CONFIGURACIÓN DE LA APLICACIÓN
// =============================================================================

/** Nombre de la aplicación */
export const APP_NAME = 'TallerAgil'

/** Versión actual */
export const APP_VERSION = '1.0.0'

/** IVA por defecto */
export const DEFAULT_IVA = 21

/** Días por defecto para vencimiento de factura */
export const DEFAULT_PAYMENT_DAYS = 30

/** Prefijo para números de orden */
export const ORDER_PREFIX = 'OR-'

/** Prefijo para números de factura */
export const INVOICE_PREFIX = 'FA'

// =============================================================================
// TIPOS DE FOTO
// =============================================================================

/**
 * Etiquetas para tipos de foto en órdenes
 */
export const FOTO_LABELS = {
  // Fotos de entrada del vehículo (las 4 caras)
  entrada: '📋 Documentación',
  frontal: '🚗 Foto Frontal',
  izquierda: '⬅️ Lateral Izquierdo',
  derecha: '➡️ Lateral Derecho',
  trasera: '🔙 Foto Trasera',
  // Fotos adicionales
  salida: '✅ Foto Salida',
  proceso: '🔧 Durante Trabajo',
  interior: '🪑 Interior/Habitáculo',
  motor: '🔧 Vano Motor',
  // Fotos de diagnóstico
  cuadro: '🎛️ Cuadro Instrumentos',
  fallo_motor: '⚠️ Testigo Avería',
  diagnostico_1: '🔍 Diagnóstico 1',
  diagnostico_2: '🔍 Diagnóstico 2',
  bastidor: '🔩 Bastidor (VIN)',
} as const

/** Tipos de foto disponibles */
export type TipoFoto = keyof typeof FOTO_LABELS

/** Fotos de diagnóstico (para la pestaña trabajo) */
export const FOTOS_DIAGNOSTICO: TipoFoto[] = ['cuadro', 'fallo_motor', 'diagnostico_1', 'diagnostico_2']
