/**
 * @fileoverview Tipos para integración con GSmart.eu
 * @description Estructuras de datos para sincronización con GSmart
 * @see https://gsmart.eu - Software de gestión para talleres mecánicos
 */

// ============================================
// CONFIGURACIÓN
// ============================================

export interface GSmartConfig {
  /** URL base de la API de GSmart (cuando esté disponible) */
  apiUrl: string
  /** API Key para autenticación */
  apiKey: string
  /** ID del taller en GSmart */
  tallerId?: string
  /** Activar sincronización automática */
  syncEnabled: boolean
  /** Intervalo de sincronización en minutos */
  syncIntervalMinutes: number
}

// ============================================
// VEHÍCULOS
// ============================================

export interface GSmartVehiculo {
  id?: string
  matricula: string
  marca: string
  modelo: string
  vin?: string
  kilometros?: number
  ano?: number
  color?: string
  combustible?: 'gasolina' | 'diesel' | 'hibrido' | 'electrico' | 'glp' | 'gnc'
  propietario?: {
    nombre: string
    telefono?: string
    email?: string
  }
}

// ============================================
// ÓRDENES DE TRABAJO
// ============================================

export interface GSmartOrden {
  id?: string
  numero?: string
  fecha_entrada: string
  fecha_salida_estimada?: string
  vehiculo: GSmartVehiculo
  estado: 'recibido' | 'diagnostico' | 'presupuesto' | 'aprobado' | 'reparacion' | 'completado' | 'entregado'
  descripcion_problema?: string
  diagnostico?: string
  trabajos?: GSmartTrabajo[]
  piezas?: GSmartPieza[]
  total_estimado?: number
  total_final?: number
}

export interface GSmartTrabajo {
  descripcion: string
  horas: number
  precio_hora: number
  operario?: string
}

export interface GSmartPieza {
  referencia?: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  precio_coste?: number
  proveedor?: string
}

// ============================================
// PRESUPUESTOS
// ============================================

export interface GSmartPresupuesto {
  id?: string
  numero?: string
  fecha: string
  vehiculo: GSmartVehiculo
  lineas: (GSmartTrabajo | GSmartPieza)[]
  subtotal: number
  iva: number
  total: number
  estado: 'pendiente' | 'aceptado' | 'rechazado' | 'expirado'
  valido_hasta?: string
}

// ============================================
// SINCRONIZACIÓN
// ============================================

export interface GSmartSyncResult {
  success: boolean
  timestamp: string
  entidad: 'vehiculos' | 'ordenes' | 'presupuestos' | 'piezas'
  registros_enviados: number
  registros_recibidos: number
  errores?: string[]
}

export interface GSmartSyncStatus {
  ultima_sincronizacion?: string
  siguiente_sincronizacion?: string
  estado: 'idle' | 'syncing' | 'error'
  ultimo_error?: string
}
