/**
 * @fileoverview Server Action: Obtener Métricas Dashboard
 * @description Retorna TODAS las métricas del dashboard ya calculadas
 *
 * IMPORTANTE: La UI NO debe hacer ningún cálculo.
 * Todos los totales, IVA, sumas vienen del servidor.
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import type { MetricasDashboardDTO } from '@/application/dtos/dashboard.dto'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Obtener Métricas Dashboard
 * Patrón blindado: Auth → Consultas → Cálculos Backend → Error Mapping
 */
export async function obtenerMetricasDashboardAction(): Promise<ActionResult<MetricasDashboardDTO>> {
  try {
    // 1. AUTENTICACIÓN
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'No autenticado' }
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, taller_id, nombre, talleres(nombre)')
      .eq('auth_id', user.id)
      .single()

    if (usuarioError || !usuario) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    const tallerId = usuario.taller_id

    // 2. CONSULTAS CON FILTRO DE SEGURIDAD (taller_id)

    // Órdenes
    const { data: ordenes, error: ordenesError } = await supabase
      .from('ordenes_reparacion')
      .select('id, estado, fecha_entrada, deleted_at')
      .eq('taller_id', tallerId)
      .is('deleted_at', null)

    if (ordenesError) throw ordenesError

    // Facturas
    const { data: facturas, error: facturasError } = await supabase
      .from('facturas')
      .select('id, total, base_imponible, iva, fecha_emision, deleted_at')
      .eq('taller_id', tallerId)
      .is('deleted_at', null)

    if (facturasError) throw facturasError

    // Clientes
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('taller_id', tallerId)
      .is('deleted_at', null)

    if (clientesError) throw clientesError

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

    // Filtrar facturas del mes y trimestre
    const facturasMes = (facturas || []).filter(f =>
      new Date(f.fecha_emision) >= inicioMes
    )

    const facturasTrimestre = (facturas || []).filter(f =>
      new Date(f.fecha_emision) >= inicioTrimestre
    )

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
      clientesActivos: clientes?.length || 0,
      nombreUsuario: usuario.nombre,
      nombreTaller: (usuario.talleres as any)?.nombre
    }

    return { success: true, data: metricas }

  } catch (error: any) {
    console.error('Error obteniendo métricas dashboard:', error)
    return {
      success: false,
      error: error.message || 'Error al obtener métricas del dashboard'
    }
  }
}
