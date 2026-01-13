/**
 * API ROUTES: TARIFAS POR TIPO DE CLIENTE
 *
 * GET /api/tarifas - Listar tarifas del taller
 * POST /api/tarifas - Crear/actualizar tarifa
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'

export async function GET() {
  try {
    const authResult = await getAuthenticatedUser()

    if (isAuthError(authResult)) {
      return authErrorResponse(authResult)
    }

    const { tallerId } = authResult
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tarifas_cliente')
      .select('*')
      .eq('taller_id', tallerId)
      .order('tipo_cliente')

    if (error) throw error

    return NextResponse.json({ tarifas: data || [] })
  } catch (error: any) {
    console.error('[Tarifas GET Error]', error)
    return NextResponse.json(
      { error: error.message || 'Error obteniendo tarifas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser()

    if (isAuthError(authResult)) {
      return authErrorResponse(authResult)
    }

    const { tallerId } = authResult
    const supabase = await createClient()
    const body = await request.json()

    // Validar tipo de cliente
    const tiposValidos = ['particular', 'empresa', 'autonomo', 'flota']
    if (!body.tipo_cliente || !tiposValidos.includes(body.tipo_cliente)) {
      return NextResponse.json(
        { error: 'Tipo de cliente inválido' },
        { status: 400 }
      )
    }

    // Upsert: crear o actualizar
    const { data, error } = await supabase
      .from('tarifas_cliente')
      .upsert({
        taller_id: tallerId,
        tipo_cliente: body.tipo_cliente,
        tarifa_hora: body.tarifa_hora || 45.00,
        tarifa_hora_urgente: body.tarifa_hora_urgente || null,
        descuento_piezas_porcentaje: body.descuento_piezas_porcentaje || 0,
        descuento_mano_obra_porcentaje: body.descuento_mano_obra_porcentaje || 0,
        dias_pago: body.dias_pago || 0,
        limite_credito: body.limite_credito || null,
        activo: body.activo !== false
      }, {
        onConflict: 'taller_id,tipo_cliente'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ tarifa: data })
  } catch (error: any) {
    console.error('[Tarifas POST Error]', error)
    return NextResponse.json(
      { error: error.message || 'Error guardando tarifa' },
      { status: 500 }
    )
  }
}

// Nota: Para usar getTarifaParaCliente, importar desde @/lib/tarifas/service
