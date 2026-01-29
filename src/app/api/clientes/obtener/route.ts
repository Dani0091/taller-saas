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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const auth = await getUsuarioTaller(supabase)
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const id = request.nextUrl.searchParams.get('id')

    if (id) {
      // Obtener cliente específico por ID
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .eq('taller_id', auth.tallerId) // Solo clientes de este taller
        .single()

      if (error || !data) {
        return NextResponse.json(
          { success: false, error: 'Cliente no encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, cliente: data })
    }

    // Obtener todos los clientes activos del taller
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('taller_id', auth.tallerId)
      .eq('estado', 'activo')
      .order('nombre')

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Error al obtener clientes' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error en servidor' },
      { status: 500 }
    )
  }
}
