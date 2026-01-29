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

    // Órdenes (no tiene deleted_at en el schema)
    const { data: ordenes, error: ordenesError } = await supabase
      .from('ordenes_reparacion')
      .select('id, estado, fecha_entrada')
      .eq('taller_id', tallerId)

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

    if (facturasError) {
      console.error('❌ Error consultando facturas:', facturasError)
      throw new Error(`Error en facturas: ${facturasError.message || facturasError.details || 'Desconocido'}`)
    }

    // Clientes (tiene deleted_at)
    const { count: clientesCount, error: clientesError } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('taller_id', tallerId)
      .is('deleted_at', null)

    if (clientesError) {
      console.error('❌ Error consultando clientes:', clientesError)
      throw new Error(`Error en clientes: ${clientesError.message || clientesError.details || 'Desconocido'}`)
    }

    // 3. CÁLCULOS EN EL BACKEND (no en la UI)

    const hoy = new Date().toISOString().split('T')[0]
    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const trimestre = Math.floor(ahora.getMonth() / 3)
    const inicioTrimestre = new Date(ahora.getFullYear(), trimestre * 3, 1)

    // Métricas operativas
    const ordenesHoy = (ordenes || []).filter(o =>
      o.fecha_entrada?.startsWith(hoy)
    ).length

    const pendientes = (ordenes || []).filter(o =>
      ['recibido', 'diagnostico', 'presupuestado', 'aprobado'].includes(o.estado)
    ).length

    const enProgreso = (ordenes || []).filter(o =>
      o.estado === 'en_reparacion'
    ).length

    const completadas = (ordenes || []).filter(o =>
      ['completado', 'entregado'].includes(o.estado)
    ).length

    // Filtrar facturas del mes y trimestre (con protección contra fechas null)
    const facturasMes = (facturas || []).filter(f => {
      if (!f.fecha_emision) return false
      return new Date(f.fecha_emision) >= inicioMes
    })

    const facturasTrimestre = (facturas || []).filter(f => {
      if (!f.fecha_emision) return false
      return new Date(f.fecha_emision) >= inicioTrimestre
    })

    // Calcular totales financieros (BACKEND hace los cálculos)
    const facturadoMes = facturasMes.reduce((sum, f) => sum + (f.total || 0), 0)
    const baseImponibleMes = facturasMes.reduce((sum, f) => sum + (f.base_imponible || 0), 0)
    const ivaRecaudadoMes = facturasMes.reduce((sum, f) => sum + (f.iva || 0), 0)
    const ivaTrimestre = facturasTrimestre.reduce((sum, f) => sum + (f.iva || 0), 0)

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
      clientesActivos: clientesCount || 0,
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
