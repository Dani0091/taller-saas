import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Obtener usuario logueado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) throw sessionError

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No hay sesión activa' },
        { status: 401 }
      )
    }

    // 2. Obtener taller_id del usuario
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('taller_id')
      .eq('email', session.user.email)
      .single()

    if (usuarioError) throw usuarioError

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Parámetros de filtro
    const searchParams = request.nextUrl.searchParams
    const incluirEliminadas = searchParams.get('incluir_eliminadas') === 'true'

    // 3. Obtener SOLO órdenes de ESTE TALLER (excluir eliminadas por defecto)
    let query = supabase
      .from('ordenes_reparacion')
      .select(`
        id,
        numero_orden,
        numero_visual,
        estado,
        cliente_id,
        clientes(nombre, telefono, nif),
        vehiculo_id,
        vehiculos(marca, modelo, matricula),
        fecha_entrada,
        total_con_iva,
        deleted_at
      `)
      .eq('taller_id', usuario.taller_id)
      .order('fecha_entrada', { ascending: false })
      .limit(50)

    // Filtrar eliminadas por defecto
    if (!incluirEliminadas) {
      query = query.is('deleted_at', null)
    }

    const { data: ordenes, error: ordenesError } = await query

    if (ordenesError) throw ordenesError

    return NextResponse.json({
      success: true,
      ordenes: ordenes || []
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Error al obtener órdenes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('taller_id')
      .eq('email', session.user.email)
      .single()

    if (!usuario?.taller_id) {
      return NextResponse.json(
        { success: false, error: 'Usuario sin taller' },
        { status: 403 }
      )
    }

    // Fix: Convertir strings vacíos a null para UUIDs
    const cleanBody = {
      ...body,
      cliente_id: body.cliente_id || null,
      vehiculo_id: body.vehiculo_id || null,
      taller_id: usuario.taller_id
    }

    const { data: orden, error } = await supabase
      .from('ordenes_reparacion')
      .insert([cleanBody])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(
      { success: true, orden },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Error al crear orden' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID requerido' },
        { status: 400 }
      )
    }

    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Campos válidos que existen en la base de datos
    const camposValidos = [
      'estado', 'cliente_id', 'vehiculo_id', 'operario_id',
      'descripcion_problema', 'diagnostico', 'trabajos_realizados',
      'fecha_entrada', 'fecha_salida_estimada', 'fecha_salida_real',
      'tiempo_estimado_horas', 'tiempo_real_horas',
      'subtotal_mano_obra', 'subtotal_piezas', 'iva_amount', 'total_con_iva',
      'presupuesto_aprobado_por_cliente', 'notas', 'fotos_entrada', 'fotos_salida'
    ]

    // Filtrar solo campos válidos
    const cleanUpdates: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    for (const campo of camposValidos) {
      if (campo in updates) {
        cleanUpdates[campo] = updates[campo]
      }
    }

    // Fix: Convertir strings vacíos a null para UUIDs
    if ('cliente_id' in cleanUpdates) {
      cleanUpdates.cliente_id = cleanUpdates.cliente_id || null
    }
    if ('vehiculo_id' in cleanUpdates) {
      cleanUpdates.vehiculo_id = cleanUpdates.vehiculo_id || null
    }

    const { data: orden, error } = await supabase
      .from('ordenes_reparacion')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      orden
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Error al actualizar orden' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Borrado lógico de orden
 * La orden no se elimina físicamente, solo se marca como eliminada
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID requerido' },
        { status: 400 }
      )
    }

    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener usuario para registrar quién eliminó
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, taller_id')
      .eq('email', session.user.email)
      .single()

    if (!usuario?.taller_id) {
      return NextResponse.json(
        { success: false, error: 'Usuario sin taller' },
        { status: 403 }
      )
    }

    // Verificar que la orden pertenece al taller
    const { data: ordenExistente } = await supabase
      .from('ordenes_reparacion')
      .select('id, numero_visual, taller_id')
      .eq('id', id)
      .eq('taller_id', usuario.taller_id)
      .is('deleted_at', null)
      .single()

    if (!ordenExistente) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Borrado lógico: marcar con deleted_at y deleted_by
    const { error } = await supabase
      .from('ordenes_reparacion')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: usuario.id
      })
      .eq('id', id)

    if (error) throw error

    // Registrar en historial de cambios (si existe la tabla)
    try {
      await supabase.from('historial_cambios').insert({
        taller_id: usuario.taller_id,
        usuario_id: usuario.id,
        tabla: 'ordenes_reparacion',
        registro_id: id,
        accion: 'eliminar',
        datos_anteriores: { numero_visual: ordenExistente.numero_visual }
      })
    } catch {
      // Ignorar si la tabla no existe todavía
    }

    return NextResponse.json({
      success: true,
      message: 'Orden eliminada correctamente'
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Error al eliminar orden' },
      { status: 500 }
    )
  }
}

/**
 * Restaurar orden eliminada (para admins)
 * PUT /api/ordenes?action=restaurar&id=xxx
 */
