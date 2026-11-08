import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'
import { leerJson } from '@/lib/api/leer-json'
import { filtrarCamposOrden, validarVinculosTaller } from '@/lib/ordenes/validar-orden'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Obtener usuario logueado
    const { data: { user }, error: sessionError } = await supabase.auth.getUser()

    if (sessionError || !user) {
      return NextResponse.json(
        { success: false, error: 'No hay sesión activa' },
        { status: 401 }
      )
    }

    // 2. Obtener taller_id del usuario
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('taller_id')
      .eq('email', user.email)
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
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)

    const validada = filtrarCamposOrden(await leerJson(request), 'crear')
    if (!validada.ok) {
      return NextResponse.json({ success: false, error: validada.error }, { status: 400 })
    }

    const supabase = await createClient()
    const errorVinculo = await validarVinculosTaller(supabase, auth.tallerId, validada.datos)
    if (errorVinculo) {
      return NextResponse.json({ success: false, error: errorVinculo }, { status: 400 })
    }

    const { data: orden, error } = await supabase
      .from('ordenes_reparacion')
      .insert([{ ...validada.datos, taller_id: auth.tallerId }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(
      { success: true, orden },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al crear orden' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)

    const body = await leerJson(request)
    const id = (body as { id?: unknown } | null)?.id
    if (typeof id !== 'string' || !id) {
      return NextResponse.json(
        { success: false, error: 'ID requerido' },
        { status: 400 }
      )
    }

    const validada = filtrarCamposOrden(body, 'editar')
    if (!validada.ok) {
      return NextResponse.json({ success: false, error: validada.error }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: ordenActual, error: ordenActualError } = await supabase
      .from('ordenes_reparacion').select('id, estado')
      .eq('id', id).eq('taller_id', auth.tallerId).maybeSingle()

    if (ordenActualError || !ordenActual) {
      return NextResponse.json({ success: false, error: 'Orden no encontrada' }, { status: 404 })
    }
    if (ordenActual.estado === 'facturado') {
      return NextResponse.json({ success: false, error: 'No se puede modificar una orden facturada' }, { status: 409 })
    }

    const errorVinculo = await validarVinculosTaller(supabase, auth.tallerId, validada.datos)
    if (errorVinculo) {
      return NextResponse.json({ success: false, error: errorVinculo }, { status: 400 })
    }

    const { data: orden, error } = await supabase
      .from('ordenes_reparacion')
      .update({ ...validada.datos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('taller_id', auth.tallerId) // Seguridad: solo actualizar órdenes del taller
      .neq('estado', 'facturado') // También protege una emisión concurrente.
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      orden
    })
  } catch {
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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener usuario para registrar quién eliminó
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, taller_id')
      .eq('email', user.email)
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
