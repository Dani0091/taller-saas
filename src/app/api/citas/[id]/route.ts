/**
 * API ROUTES: CITA INDIVIDUAL
 *
 * GET /api/citas/[id] - Obtener cita
 * PUT /api/citas/[id] - Actualizar cita
 * DELETE /api/citas/[id] - Eliminar cita
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await getAuthenticatedUser()

    if (isAuthError(authResult)) {
      return authErrorResponse(authResult)
    }

    const { tallerId } = authResult
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('citas')
      .select(`
        *,
        cliente:clientes(id, nombre, apellidos, telefono, email),
        vehiculo:vehiculos(id, matricula, marca, modelo)
      `)
      .eq('id', id)
      .eq('taller_id', tallerId)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ cita: data })
  } catch (error: any) {
    console.error('[Cita GET Error]', error)
    return NextResponse.json(
      { error: error.message || 'Error obteniendo cita' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await getAuthenticatedUser()

    if (isAuthError(authResult)) {
      return authErrorResponse(authResult)
    }

    const { tallerId } = authResult
    const supabase = await createClient()
    const body = await request.json()

    // Verificar que la cita pertenece al taller
    const { data: citaExistente } = await supabase
      .from('citas')
      .select('id')
      .eq('id', id)
      .eq('taller_id', tallerId)
      .single()

    if (!citaExistente) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    // Campos actualizables
    const updateData: Record<string, any> = {}

    const camposPermitidos = [
      'cliente_id', 'vehiculo_id', 'orden_id', 'titulo', 'descripcion',
      'tipo', 'fecha_inicio', 'fecha_fin', 'todo_el_dia', 'estado',
      'recordatorio_email', 'recordatorio_sms', 'minutos_antes_recordatorio',
      'color', 'notas'
    ]

    for (const campo of camposPermitidos) {
      if (body[campo] !== undefined) {
        updateData[campo] = body[campo]
      }
    }

    const { data, error } = await supabase
      .from('citas')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        cliente:clientes(id, nombre, apellidos, telefono),
        vehiculo:vehiculos(id, matricula, marca, modelo)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ cita: data })
  } catch (error: any) {
    console.error('[Cita PUT Error]', error)
    return NextResponse.json(
      { error: error.message || 'Error actualizando cita' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await getAuthenticatedUser()

    if (isAuthError(authResult)) {
      return authErrorResponse(authResult)
    }

    const { tallerId } = authResult
    const supabase = await createClient()

    // Verificar y eliminar
    const { error } = await supabase
      .from('citas')
      .delete()
      .eq('id', id)
      .eq('taller_id', tallerId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Cita DELETE Error]', error)
    return NextResponse.json(
      { error: error.message || 'Error eliminando cita' },
      { status: 500 }
    )
  }
}
