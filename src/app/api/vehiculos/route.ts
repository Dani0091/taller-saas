import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Helper: Obtener taller_id del usuario autenticado
 */
async function getUsuarioTaller(supabase: any) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return { error: 'No autorizado', status: 401 }
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('taller_id')
    .eq('email', session.user.email)
    .single()

  if (!usuario?.taller_id) {
    return { error: 'Usuario sin taller asignado', status: 403 }
  }

  return { tallerId: usuario.taller_id }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const auth = await getUsuarioTaller(supabase)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('cliente_id')

    let query = supabase
      .from('vehiculos')
      .select('*')
      .eq('taller_id', auth.tallerId) // Solo vehículos del taller del usuario

    // Filtrar por cliente si se especifica
    if (clienteId) {
      query = query.eq('cliente_id', clienteId)
    }

    const { data, error } = await query.order('matricula', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: 'Error al obtener vehículos' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error en servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const auth = await getUsuarioTaller(supabase)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()

    if (!body.matricula) {
      return NextResponse.json(
        { error: 'Matrícula es obligatoria' },
        { status: 400 }
      )
    }

    // Limpiar matrícula
    const matriculaLimpia = body.matricula.toUpperCase().replace(/[\s-]/g, '')

    // Verificar si ya existe en este taller
    const { data: existe } = await supabase
      .from('vehiculos')
      .select('id')
      .eq('taller_id', auth.tallerId)
      .eq('matricula', matriculaLimpia)
      .single()

    if (existe) {
      return NextResponse.json(
        { error: 'Ya existe un vehículo con esta matrícula' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('vehiculos')
      .insert({
        taller_id: auth.tallerId, // Siempre usar el taller del usuario autenticado
        cliente_id: body.cliente_id || null,
        matricula: matriculaLimpia,
        marca: body.marca || null,
        modelo: body.modelo || null,
        año: body.año || null,
        color: body.color || null,
        kilometros: body.kilometros || null,
        tipo_combustible: body.tipo_combustible || null,
        vin: body.vin || null,
        bastidor_vin: body.bastidor_vin || null,
        carroceria: body.carroceria || null,
        potencia_cv: body.potencia_cv || null,
        cilindrada: body.cilindrada || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Error al crear vehículo' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creando vehículo' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const auth = await getUsuarioTaller(supabase)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID de vehículo requerido' },
        { status: 400 }
      )
    }

    // Verificar que el vehículo pertenece al taller del usuario
    const { data: vehiculo } = await supabase
      .from('vehiculos')
      .select('taller_id')
      .eq('id', body.id)
      .single()

    if (!vehiculo || vehiculo.taller_id !== auth.tallerId) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    // Solo incluir campos que se envían
    const camposPermitidos = [
      'kilometros', 'marca', 'modelo', 'color', 'tipo_combustible',
      'cliente_id', 'año', 'vin', 'bastidor_vin', 'carroceria',
      'potencia_cv', 'cilindrada'
    ]

    for (const campo of camposPermitidos) {
      if (body[campo] !== undefined) {
        updateData[campo] = body[campo]
      }
    }

    const { data, error } = await supabase
      .from('vehiculos')
      .update(updateData)
      .eq('id', body.id)
      .eq('taller_id', auth.tallerId) // Doble verificación
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Error al actualizar vehículo' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error actualizando vehículo' },
      { status: 500 }
    )
  }
}
