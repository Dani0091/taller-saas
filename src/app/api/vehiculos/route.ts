import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const tallerId = searchParams.get('taller_id')
    const clienteId = searchParams.get('cliente_id')

    if (!tallerId) {
      return NextResponse.json(
        { error: 'taller_id requerido' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('vehiculos')
      .select('*')
      .eq('taller_id', tallerId)

    // Filtrar por cliente si se especifica
    if (clienteId) {
      query = query.eq('cliente_id', clienteId)
    }

    const { data, error } = await query.order('matricula', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error en GET vehiculos:', error)
    return NextResponse.json(
      { error: 'Error en servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    if (!body.taller_id || !body.matricula) {
      return NextResponse.json(
        { error: 'Matrícula es obligatoria' },
        { status: 400 }
      )
    }

    // Limpiar matrícula
    const matriculaLimpia = body.matricula.toUpperCase().replace(/[\s-]/g, '')

    // Verificar si ya existe
    const { data: existe } = await supabase
      .from('vehiculos')
      .select('id')
      .eq('taller_id', body.taller_id)
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
        taller_id: body.taller_id,
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
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error en POST vehiculos:', error)
    return NextResponse.json(
      { error: 'Error creando vehículo' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID de vehículo requerido' },
        { status: 400 }
      )
    }

    const updateData: any = { updated_at: new Date().toISOString() }

    // Solo incluir campos que se envían
    if (body.kilometros !== undefined) updateData.kilometros = body.kilometros
    if (body.marca !== undefined) updateData.marca = body.marca
    if (body.modelo !== undefined) updateData.modelo = body.modelo
    if (body.color !== undefined) updateData.color = body.color
    if (body.tipo_combustible !== undefined) updateData.tipo_combustible = body.tipo_combustible
    if (body.cliente_id !== undefined) updateData.cliente_id = body.cliente_id

    const { data, error } = await supabase
      .from('vehiculos')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error en PATCH vehiculos:', error)
    return NextResponse.json(
      { error: 'Error actualizando vehículo' },
      { status: 500 }
    )
  }
}