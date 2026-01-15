/**
 * API ROUTES: GESTIÓN DE CITAS
 *
 * GET /api/citas - Listar citas
 * POST /api/citas - Crear cita
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser()

    if (isAuthError(authResult)) {
      return authErrorResponse(authResult)
    }

    const { tallerId, email } = authResult
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    // Parámetros de filtro
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const estado = searchParams.get('estado')
    const clienteId = searchParams.get('cliente_id')
    const vehiculoId = searchParams.get('vehiculo_id')

    // Query base
    let query = supabase
      .from('citas')
      .select(`
        *,
        cliente:clientes(id, nombre, apellidos, telefono),
        vehiculo:vehiculos(id, matricula, marca, modelo)
      `)
      .eq('taller_id', tallerId)
      .order('fecha_inicio', { ascending: true })

    // Aplicar filtros
    if (desde) {
      query = query.gte('fecha_inicio', desde)
    }
    if (hasta) {
      query = query.lte('fecha_inicio', hasta)
    }
    if (estado) {
      query = query.eq('estado', estado)
    }
    if (clienteId) {
      query = query.eq('cliente_id', clienteId)
    }
    if (vehiculoId) {
      query = query.eq('vehiculo_id', vehiculoId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ citas: data })
  } catch (error: any) {
    console.error('[Citas GET Error]', error)
    return NextResponse.json(
      { error: error.message || 'Error obteniendo citas' },
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

    const { tallerId, email } = authResult
    const supabase = await createClient()
    const body = await request.json()

    // Validar campos requeridos
    if (!body.titulo || !body.fecha_inicio) {
      return NextResponse.json(
        { error: 'Título y fecha de inicio son requeridos' },
        { status: 400 }
      )
    }

    // Obtener usuario_id
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .eq('taller_id', tallerId)
      .single()

    // Crear cita
    const { data, error } = await supabase
      .from('citas')
      .insert({
        taller_id: tallerId,
        cliente_id: body.cliente_id || null,
        vehiculo_id: body.vehiculo_id || null,
        orden_id: body.orden_id || null,
        titulo: body.titulo,
        descripcion: body.descripcion || null,
        tipo: body.tipo || 'cita',
        fecha_inicio: body.fecha_inicio,
        fecha_fin: body.fecha_fin || null,
        todo_el_dia: body.todo_el_dia || false,
        estado: 'pendiente',
        recordatorio_email: body.recordatorio_email || false,
        recordatorio_sms: body.recordatorio_sms || false,
        minutos_antes_recordatorio: body.minutos_antes_recordatorio || 60,
        color: body.color || '#3b82f6',
        notas: body.notas || null,
        created_by: usuario?.id || null
      })
      .select(`
        *,
        cliente:clientes(id, nombre, apellidos, telefono),
        vehiculo:vehiculos(id, matricula, marca, modelo)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ cita: data })
  } catch (error: any) {
    console.error('[Citas POST Error]', error)
    return NextResponse.json(
      { error: error.message || 'Error creando cita' },
      { status: 500 }
    )
  }
}
