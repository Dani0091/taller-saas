/**
 * @fileoverview Módulo de integración con GSmart.eu
 * @description Exporta todas las funcionalidades para integración con GSmart
 *
 * USO:
 * ```typescript
 * import { getGSmartClient, GSmartOrden } from '@/lib/integrations/gsmart'
 *
 * const client = getGSmartClient({
 *   apiKey: 'tu-api-key',
 *   apiUrl: 'https://api.gsmart.eu/v1'
 * })
 *
 * const result = await client.enviarOrden(orden)
 * ```
 *
 * ESTADO ACTUAL: Placeholder
 * Para activar la integración real, contactar: support@gsmart.eu
 */

// Tipos
export type {
  GSmartConfig,
  GSmartVehiculo,
  GSmartOrden,
  GSmartTrabajo,
  GSmartPieza,
  GSmartPresupuesto,
  GSmartSyncResult,
  GSmartSyncStatus
} from './types'

// Cliente
export {
  GSmartClient,
  getGSmartClient,
  resetGSmartClient
} from './client'

// Mappers (para convertir entre formatos TallerAgil ↔ GSmart)
export * from './mappers'
