/**
 * API ENDPOINT: Compartir presupuesto/orden
 *
 * Marca la orden como compartida y devuelve el enlace público.
 * Cada envío guarda el total y la versión de lo enviado (A10): queda constancia
 * de qué recibió el cliente y la aceptación se compara con ello.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { leerJson } from '@/lib/api/leer-json'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'
import { cargarPresupuesto } from '@/lib/ordenes/cargar-presupuesto'
import { redondearImporte } from '@/lib/ordenes/version-presupuesto'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)

    const supabase = await createClient()
    const body = (await leerJson(request)) as { orden_id?: string } | null
    if (!body) {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const { orden_id } = body

    if (!orden_id) {
      return NextResponse.json(
        { error: 'orden_id es requerido' },
        { status: 400 }
      )
    }

    // Verificar que la orden existe y pertenece al usuario
    const { data: orden, error: ordenError } = await supabase
      .from('ordenes_reparacion')
      .select('id, taller_id, iva_porcentaje, token_publico, fecha_envio_presupuesto')
      .eq('id', orden_id)
      .eq('taller_id', auth.tallerId)
      .single()

    if (ordenError || !orden) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    const { totales, version } = await cargarPresupuesto(supabase, orden)
    const fechaEnvio = orden.fecha_envio_presupuesto || new Date().toISOString()

    // La fecha es la del primer envío; el total y la versión, los del último
    const { data: updated, error: updateError } = await supabase
      .from('ordenes_reparacion')
      .update({
        fecha_envio_presupuesto: fechaEnvio,
        presupuesto_total_compartido: redondearImporte(totales.total),
        presupuesto_hash_lineas: version,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orden_id)
      .eq('taller_id', auth.tallerId)
      .select('token_publico')
      .single()

    if (updateError) {
      throw updateError
    }

    const tokenPublico = updated.token_publico

    // Construir URL pública
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    request.headers.get('origin') ||
                    'http://localhost:3000'

    const urlPublica = `${baseUrl}/presupuesto/${tokenPublico}`

    return NextResponse.json({
      success: true,
      url: urlPublica,
      token: tokenPublico,
      fechaEnvio,
    })
  } catch (error) {
    console.error('Error compartiendo presupuesto:', error)
    return NextResponse.json(
      { error: 'Error al compartir presupuesto' },
      { status: 500 }
    )
  }
}
