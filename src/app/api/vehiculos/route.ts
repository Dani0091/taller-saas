import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const tallerId = searchParams.get('taller_id')

    if (!tallerId) {
      return NextResponse.json(
        { error: 'taller_id requerido' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('taller_id', tallerId)
      .order('created_at', { ascending: false })

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
        { error: 'Campos requeridos faltantes' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('vehiculos')
      .insert({
        taller_id: body.taller_id,
        cliente_id: body.cliente_id || null,
        matricula: body.matricula,
        marca: body.marca || null,
        modelo: body.modelo || null,
        año: body.año || null,
        color: body.color || null,
        kilometros: body.kilometros || null,
        tipo_combustible: body.tipo_combustible || null,
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