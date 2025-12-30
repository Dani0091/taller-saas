import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('📥 GET /api/ordenes - Iniciando...')
    
    const supabase = await createClient()
    console.log('✅ Cliente Supabase creado')
    
    // 1. Obtener usuario logueado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('🔐 Sesión:', session?.user?.email)
    
    if (sessionError) {
      console.error('❌ Error sesión:', sessionError)
      throw sessionError
    }
    
    if (!session?.user) {
      console.error('❌ No hay usuario logueado')
      return NextResponse.json(
        { success: false, error: 'No hay sesión activa' },
        { status: 401 }
      )
    }

    // 2. Obtener taller_id del usuario
    console.log('🔍 Buscando usuario con email:', session.user.email)
    
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('taller_id')
      .eq('email', session.user.email)
      .single()

    if (usuarioError) {
      console.error('❌ Error usuario:', usuarioError)
      throw usuarioError
    }

    if (!usuario) {
      console.error('❌ Usuario no encontrado')
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    console.log('👤 Usuario encontrado con taller_id:', usuario.taller_id)

    // 3. Obtener SOLO órdenes de ESTE TALLER
    console.log('📋 Consultando órdenes para taller:', usuario.taller_id)
    
    const { data: ordenes, error: ordenesError } = await supabase
      .from('ordenes_reparacion')
      .select(`
        id,
        numero_orden,
        estado,
        cliente_id,
        clientes(nombre, telefono, nif),
        vehiculo_id,
        vehiculos(marca, modelo, matricula),
        fecha_entrada,
        total_con_iva
      `)
      .eq('taller_id', usuario.taller_id)
      .order('fecha_entrada', { ascending: false })
      .limit(50)

    if (ordenesError) {
      console.error('❌ Error órdenes:', ordenesError)
      throw ordenesError
    }

    console.log('✅ Órdenes encontradas:', ordenes?.length)

    return NextResponse.json({ 
      success: true,
      ordenes: ordenes || [] 
    })
  } catch (error: any) {
    console.error('❌ Error general GET /api/ordenes:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: { session } } = await supabase.auth.getSession()
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('taller_id')
      .eq('email', session?.user?.email)
      .single()

    // Fix: Convertir strings vacíos a null para UUIDs
    const cleanBody = {
      ...body,
      cliente_id: body.cliente_id || null,
      vehiculo_id: body.vehiculo_id || null,
      taller_id: usuario?.taller_id
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
    console.error('❌ Error POST ordenes:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) throw new Error('ID requerido')

    // Fix: Convertir strings vacíos a null para UUIDs
    const cleanUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    }

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
    console.error('❌ Error PATCH ordenes:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
