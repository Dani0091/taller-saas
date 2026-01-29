import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Helper: Obtener taller_id del usuario autenticado
 */
async function getUsuarioTaller(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autorizado', status: 401 }
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('taller_id')
    .eq('email', user.email)
    .single()

  if (!usuario?.taller_id) {
    return { error: 'Usuario sin taller asignado', status: 403 }
  }

  return { tallerId: usuario.taller_id }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const auth = await getUsuarioTaller(supabase)
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { id, ...datosActualizar } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el cliente pertenece al taller del usuario
    const { data: cliente } = await supabase
      .from('clientes')
      .select('taller_id')
      .eq('id', id)
      .single()

    if (!cliente || cliente.taller_id !== auth.tallerId) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Campos permitidos para actualizar (evitar inyección de campos no deseados)
    const camposPermitidos = [
      'nombre', 'apellidos', 'primer_apellido', 'segundo_apellido',
      'nif', 'email', 'telefono', 'direccion', 'ciudad', 'provincia',
      'codigo_postal', 'pais', 'notas', 'estado', 'tipo_cliente',
      'iban', 'forma_pago', 'contacto_principal', 'contacto_email', 'contacto_telefono'
    ]

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    for (const campo of camposPermitidos) {
      if (datosActualizar[campo] !== undefined) {
        updateData[campo] = datosActualizar[campo]
      }
    }

    const { data, error } = await supabase
      .from('clientes')
      .update(updateData)
      .eq('id', id)
      .eq('taller_id', auth.tallerId) // Doble verificación
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Error al actualizar cliente' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      cliente: data,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// También soportar PUT por compatibilidad
export async function PUT(request: NextRequest) {
  return PATCH(request)
}
