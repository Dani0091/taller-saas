/**
 * @fileoverview Server Action: Obtener Métricas Dashboard
 * @description Retorna TODAS las métricas del dashboard ya calculadas
 *
 * IMPORTANTE: La UI NO debe hacer ningún cálculo.
 * Todos los totales, IVA, sumas vienen del servidor.
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'
import type { MetricasDashboardDTO } from '@/application/dtos/dashboard.dto'
import { calcularMetricas } from '@/lib/dashboard/metricas'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Obtener Métricas Dashboard
 * Patrón blindado: Auth → Consultas → Cálculos Backend → Error Mapping
 */
export async function obtenerMetricasDashboardAction(): Promise<ActionResult<MetricasDashboardDTO>> {
  try {
    // 1. AUTENTICACIÓN CON FALLBACK
    const usuario = await obtenerUsuarioConFallback()

    if (!usuario) {
      console.error('❌ Usuario no encontrado en obtenerMetricasDashboardAction')
      return { success: false, error: 'Usuario no encontrado' }
    }

    const tallerId = usuario.taller_id
    const supabase = await createClient()

    // 2. CONSULTAS CON FILTRO DE SEGURIDAD (taller_id)
    // PROTECCIÓN: Si no hay datos, retornar arrays vacíos (NO lanzar DATABASE_ERROR)

    // Órdenes (tiene deleted_at)
    const { data: ordenes, error: ordenesError } = await supabase
      .from('ordenes_reparacion')
      .select('id, estado, fecha_entrada')
      .eq('taller_id', tallerId)
      .is('deleted_at', null)

    // Solo lanzar error si es un error REAL de BD, no si simplemente no hay datos
    if (ordenesError) {
      console.error('❌ Error consultando órdenes:', ordenesError)
      throw new Error(`Error en órdenes: ${ordenesError.message || ordenesError.details || 'Desconocido'}`)
    }

    // Facturas (tiene deleted_at)
    const { data: facturas, error: facturasError } = await supabase
      .from('facturas')
      .select('id, estado, total, base_imponible, iva, fecha_emision')
      .eq('taller_id', tallerId)
      .is('deleted_at', null)

    // Solo lanzar error si es un error REAL de BD, no si simplemente no hay datos
    if (facturasError) {
      console.error('❌ Error consultando facturas:', facturasError)
      throw new Error(`Error en facturas: ${facturasError.message || facturasError.details || 'Desconocido'}`)
    }

    // Clientes (NO tiene deleted_at - hard delete) - NO CRÍTICO: Si falla, el dashboard sigue funcionando
    let clientesCount = 0
    try {
      const result = await supabase
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .eq('taller_id', tallerId)
        // NOTA: La tabla clientes NO tiene deleted_at (hard delete)

      if (result.error) {
        console.warn('⚠️ Error consultando clientes (no crítico):', result.error)
        // No lanzamos error, solo logueamos
      } else {
        clientesCount = result.count || 0
      }
    } catch (clientesError: any) {
      console.warn('⚠️ Excepción consultando clientes (no crítico):', clientesError)
      // Continuamos con count = 0
    }

    // 3. CÁLCULOS EN EL BACKEND (no en la UI)
    // PROTECCIÓN: Arrays vacíos retornan 0, nunca undefined o NaN

    // Estados reales de órdenes y solo facturas emitidas (ver lib/dashboard/metricas)
    const calculadas = calcularMetricas(ordenes || [], facturas || [])

    const metricas: MetricasDashboardDTO = {
      ...calculadas,
      ivaTrimestre: calculadas.trimestre.iva,
      clientesActivos: clientesCount,
      nombreUsuario: usuario.nombre ?? undefined,
      nombreTaller: usuario.talleres?.nombre ?? undefined
    }

    return { success: true, data: metricas }

  } catch (error: any) {
    // Logging mejorado para debugging
    console.error('❌ Error obteniendo métricas dashboard:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: JSON.stringify(error, null, 2)
    })

    return {
      success: false,
      error: error.message || error.details || error.hint || 'Error al obtener métricas del dashboard'
    }
  }
}
