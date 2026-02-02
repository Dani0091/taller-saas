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

    console.log('✅ Usuario para métricas:', {
      email: usuario.email,
      taller_id: usuario.taller_id,
      tiene_talleres: !!usuario.talleres
    })

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
      .select('id, total, base_imponible, iva, fecha_emision')
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

    const hoy = new Date().toISOString().split('T')[0]
    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const trimestre = Math.floor(ahora.getMonth() / 3)
    const inicioTrimestre = new Date(ahora.getFullYear(), trimestre * 3, 1)

    // Métricas operativas (protegidas contra null/undefined)
    const ordenesArray = ordenes || []
    const ordenesHoy = ordenesArray.filter(o =>
      o.fecha_entrada?.startsWith(hoy)
    ).length || 0

    const pendientes = ordenesArray.filter(o =>
      o.estado && ['recibido', 'diagnostico', 'presupuestado', 'aprobado'].includes(o.estado)
    ).length || 0

    const enProgreso = ordenesArray.filter(o =>
      o.estado === 'en_reparacion'
    ).length || 0

    const completadas = ordenesArray.filter(o =>
      o.estado && ['completado', 'entregado'].includes(o.estado)
    ).length || 0

    // Filtrar facturas del mes y trimestre (con protección contra fechas null)
    const facturasArray = facturas || []
    const facturasMes = facturasArray.filter(f => {
      if (!f.fecha_emision) return false
      try {
        return new Date(f.fecha_emision) >= inicioMes
      } catch {
        return false
      }
    })

    const facturasTrimestre = facturasArray.filter(f => {
      if (!f.fecha_emision) return false
      try {
        return new Date(f.fecha_emision) >= inicioTrimestre
      } catch {
        return false
      }
    })

    // Calcular totales financieros (BACKEND hace los cálculos)
    // Protegido: reduce siempre retorna un número, nunca undefined
    const facturadoMes = facturasMes.reduce((sum, f) => sum + (Number(f.total) || 0), 0)
    const baseImponibleMes = facturasMes.reduce((sum, f) => sum + (Number(f.base_imponible) || 0), 0)
    const ivaRecaudadoMes = facturasMes.reduce((sum, f) => sum + (Number(f.iva) || 0), 0)
    const ivaTrimestre = facturasTrimestre.reduce((sum, f) => sum + (Number(f.iva) || 0), 0)

    // 4. RETORNAR MÉTRICAS PRE-CALCULADAS
    const metricas: MetricasDashboardDTO = {
      ordenesHoy,
      pendientes,
      enProgreso,
      completadas,
      facturadoMes,
      baseImponibleMes,
      ivaRecaudadoMes,
      ivaTrimestre,
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
