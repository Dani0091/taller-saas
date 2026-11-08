/**
 * @fileoverview Carga líneas + IVA de una orden y calcula totales y versión
 * @description Compartido por /api/presupuesto/[token] (GET y POST) y
 * /api/ordenes/compartir, para que los tres vean exactamente el mismo importe.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { calcularTotalesPresupuesto, versionPresupuesto, ivaDeOrden, type LineaPresupuesto, type TotalesPresupuesto } from './version-presupuesto'

export interface LineaPresupuestoCompleta extends LineaPresupuesto {
  importe_total: number | null
}

export interface PresupuestoCalculado {
  lineas: LineaPresupuestoCompleta[]
  totales: TotalesPresupuesto
  version: string
}

export async function cargarPresupuesto(
  supabase: SupabaseClient,
  orden: { id: string; taller_id: string; iva_porcentaje: number | null }
): Promise<PresupuestoCalculado> {
  const [{ data: lineas, error }, { data: config }] = await Promise.all([
    supabase
      .from('lineas_orden')
      .select('id, tipo, descripcion, cantidad, precio_unitario, importe_total')
      .eq('orden_id', orden.id)
      .order('created_at'),
    supabase.from('taller_config').select('porcentaje_iva').eq('taller_id', orden.taller_id).maybeSingle(),
  ])
  if (error) throw error

  const normalizadas: LineaPresupuestoCompleta[] = (lineas ?? []).map((l) => ({
    id: l.id,
    tipo: l.tipo,
    descripcion: l.descripcion,
    cantidad: Number(l.cantidad),
    precio_unitario: Number(l.precio_unitario),
    importe_total: l.importe_total == null ? null : Number(l.importe_total),
  }))
  const iva = ivaDeOrden(orden.iva_porcentaje, config?.porcentaje_iva)

  return {
    lineas: normalizadas,
    totales: calcularTotalesPresupuesto(normalizadas, iva),
    version: versionPresupuesto(normalizadas, iva),
  }
}
