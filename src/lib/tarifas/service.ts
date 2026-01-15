/**
 * Servicio de tarifas por tipo de cliente
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Obtiene la tarifa para un tipo de cliente específico
 */
export async function getTarifaParaCliente(
  taller_id: string,
  tipo_cliente: string
): Promise<{
  tarifa_hora: number
  descuento_piezas: number
  descuento_mano_obra: number
  dias_pago: number
} | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('tarifas_cliente')
    .select('tarifa_hora, descuento_piezas_porcentaje, descuento_mano_obra_porcentaje, dias_pago')
    .eq('taller_id', taller_id)
    .eq('tipo_cliente', tipo_cliente)
    .eq('activo', true)
    .single()

  if (!data) return null

  return {
    tarifa_hora: data.tarifa_hora,
    descuento_piezas: data.descuento_piezas_porcentaje,
    descuento_mano_obra: data.descuento_mano_obra_porcentaje,
    dias_pago: data.dias_pago
  }
}

/**
 * Obtiene todas las tarifas de un taller
 */
export async function getTarifasTaller(taller_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tarifas_cliente')
    .select('*')
    .eq('taller_id', taller_id)
    .eq('activo', true)
    .order('tipo_cliente')

  if (error) throw error

  return data || []
}
