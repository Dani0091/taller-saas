'use server'

import { createClient } from '@/lib/supabase/server'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import { TotalesOrdenDTO } from '@/application/dtos/orden.dto'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Calcular Totales de Orden
 *
 * IMPORTANTE: Esta acción realiza todos los cálculos en el servidor.
 * El frontend NUNCA debe calcular IVA, totales o subtotales.
 *
 * @param ordenId - ID de la orden
 * @returns Totales calculados en el backend
 */
export async function calcularTotalesOrdenAction(
  ordenId: string
): Promise<ActionResult<TotalesOrdenDTO>> {
  try {
    // 1. AUTENTICACIÓN
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'No autenticado' }
    }

    const usuario = await obtenerUsuarioConFallback()

    if (!usuario) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // 2. VERIFICAR ACCESO A LA ORDEN (multi-tenancy)
    const { data: orden, error: ordenError } = await supabase
      .from('ordenes_reparacion')
      .select('id, taller_id')
      .eq('id', ordenId)
      .eq('taller_id', usuario.taller_id)
      .single()

    if (ordenError || !orden) {
      return { success: false, error: 'Orden no encontrada o sin acceso' }
    }

    // 3. OBTENER LÍNEAS DE LA ORDEN
    const { data: lineas, error: lineasError } = await supabase
      .from('lineas_orden')
      .select('id, tipo, cantidad, precio_unitario')
      .eq('orden_id', ordenId)

    if (lineasError) {
      return { success: false, error: 'Error al obtener líneas de la orden' }
    }

    // 4. OBTENER CONFIGURACIÓN DE IVA DEL TALLER
    const { data: config, error: configError } = await supabase
      .from('taller_config')
      .select('iva_general')
      .eq('taller_id', usuario.taller_id)
      .single()

    // Valor por defecto de IVA si no está configurado
    const porcentajeIVA = config?.iva_general || 21

    // 5. CALCULAR TOTALES EN EL SERVIDOR (única fuente de verdad)
    const totales = (lineas || []).reduce(
      (acc, linea) => {
        const subtotalLinea = linea.cantidad * linea.precio_unitario
        const ivaLinea = subtotalLinea * (porcentajeIVA / 100)

        return {
          manoObra: linea.tipo === 'mano_obra' ? acc.manoObra + subtotalLinea : acc.manoObra,
          piezas: linea.tipo === 'pieza' ? acc.piezas + subtotalLinea : acc.piezas,
          servicios: linea.tipo === 'servicio' ? acc.servicios + subtotalLinea : acc.servicios,
          subtotal: acc.subtotal + subtotalLinea,
          iva: acc.iva + ivaLinea,
          total: acc.total + subtotalLinea + ivaLinea,
        }
      },
      {
        manoObra: 0,
        piezas: 0,
        servicios: 0,
        subtotal: 0,
        iva: 0,
        total: 0,
      }
    )

    // 6. RETORNAR TOTALES CALCULADOS
    return { success: true, data: totales }

  } catch (error: any) {
    console.error('❌ Error en calcularTotalesOrden:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })

    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }

    const domainError = SupabaseErrorMapper.toDomainError(error)
    return {
      success: false,
      error: domainError.message || 'Error alCalcular totales orden'
    }
  }
}
