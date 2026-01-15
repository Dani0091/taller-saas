/**
 * API ENDPOINT: Compartir presupuesto/orden
 *
 * Marca la orden como compartida y devuelve el enlace público
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

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
      .select('id, token_publico, fecha_envio_presupuesto')
      .eq('id', orden_id)
      .single()

    if (ordenError || !orden) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Si no tiene token, generar uno nuevo
    let tokenPublico = orden.token_publico

    // Actualizar fecha de envío si no está marcada
    if (!orden.fecha_envio_presupuesto) {
      const { data: updated, error: updateError } = await supabase
        .from('ordenes_reparacion')
        .update({
          fecha_envio_presupuesto: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orden_id)
        .select('token_publico')
        .single()

      if (updateError) {
        throw updateError
      }

      tokenPublico = updated.token_publico
    }

    // Construir URL pública
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    request.headers.get('origin') ||
                    'http://localhost:3000'

    const urlPublica = `${baseUrl}/presupuesto/${tokenPublico}`

    return NextResponse.json({
      success: true,
      url: urlPublica,
      token: tokenPublico,
      fechaEnvio: orden.fecha_envio_presupuesto || new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error compartiendo presupuesto:', error)
    return NextResponse.json(
      { error: 'Error al compartir presupuesto' },
      { status: 500 }
    )
  }
}
