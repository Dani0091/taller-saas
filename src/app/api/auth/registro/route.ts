import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API para registro de nuevos talleres
 * Usa service role key para bypasear RLS
 */
export async function POST(request: Request) {
  try {
    // Verificar variables de entorno primero
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL no está configurada')
      return NextResponse.json(
        { error: 'Error de configuración del servidor (URL)' },
        { status: 500 }
      )
    }

    if (!supabaseServiceKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurada')
      return NextResponse.json(
        { error: 'Error de configuración del servidor (KEY). Contacta al administrador.' },
        { status: 500 }
      )
    }

    const body = await request.json()

    const {
      nombre_taller,
      cif,
      direccion,
      telefono,
      email_taller,
      nombre_usuario,
      email_usuario,
      password,
    } = body

    // Validaciones
    if (!nombre_taller?.trim()) {
      return NextResponse.json(
        { error: 'El nombre del taller es obligatorio' },
        { status: 400 }
      )
    }

    if (!cif?.trim()) {
      return NextResponse.json(
        { error: 'El CIF/NIF es obligatorio' },
        { status: 400 }
      )
    }

    if (!nombre_usuario?.trim()) {
      return NextResponse.json(
        { error: 'El nombre del usuario es obligatorio' },
        { status: 400 }
      )
    }

    if (!email_usuario?.trim()) {
      return NextResponse.json(
        { error: 'El email es obligatorio' },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Crear cliente admin directamente (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('📝 Iniciando registro para:', email_usuario)

    // 1. Verificar si el email ya existe en usuarios
    const { data: existingUser } = await supabaseAdmin
      .from('usuarios')
      .select('email')
      .eq('email', email_usuario)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      )
    }

    // 2. Crear usuario en Supabase Auth
    console.log('📝 Creando usuario en Auth...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email_usuario,
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre: nombre_usuario,
      }
    })

    if (authError) {
      console.error('❌ Error creando auth user:', authError.message)
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'Este email ya está registrado en el sistema' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: `Error al crear usuario: ${authError.message}` },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Error al crear usuario - sin datos' },
        { status: 500 }
      )
    }

    console.log('✅ Usuario Auth creado:', authData.user.id)

    // 3. Crear el taller
    console.log('📝 Creando taller...')
    const { data: taller, error: tallerError } = await supabaseAdmin
      .from('talleres')
      .insert({
        nombre: nombre_taller,
        cif: cif,
        direccion: direccion || null,
        telefono: telefono || null,
        email: email_taller || email_usuario,
        plan_nombre: 'trial',
        suscripcion_activa: true,
      })
      .select('id')
      .single()

    if (tallerError) {
      console.error('❌ Error creando taller:', tallerError.message, tallerError.details)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `Error al crear el taller: ${tallerError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Taller creado:', taller.id)

    // 4. Crear el usuario vinculado al taller
    console.log('📝 Vinculando usuario al taller...')
    const { data: usuarioData, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        auth_id: authData.user.id,
        email: email_usuario,
        nombre: nombre_usuario,
        rol: 'admin',
        taller_id: taller.id,
        activo: true,
      })
      .select()
      .single()

    if (usuarioError) {
      console.error('❌ Error creando usuario:', usuarioError.message, usuarioError.details, usuarioError.hint)
      await supabaseAdmin.from('talleres').delete().eq('id', taller.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `Error al vincular usuario: ${usuarioError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Usuario vinculado:', usuarioData.id)

    // 5. Crear configuración por defecto del taller en taller_config (tabla real)
    console.log('📝 Creando configuración...')

    const { error: configError } = await supabaseAdmin
      .from('taller_config')
      .insert({
        taller_id: taller.id,
        nombre_empresa: nombre_taller,
        nombre_taller: nombre_taller,
        cif: cif,
        direccion: direccion || null,
        telefono: telefono || null,
        email: email_taller || email_usuario,
        tarifa_hora: 45,
        porcentaje_iva: 21,
        incluye_iva: true,
        tarifa_con_iva: true,
        serie_factura: 'FA',
        numero_factura_inicial: 1,
      })

    if (configError) {
      console.error('⚠️ Error creando taller_config (no crítico):', configError.message)
    } else {
      console.log('✅ Configuración creada en taller_config')
    }

    console.log('🎉 Registro completado exitosamente')

    return NextResponse.json({
      success: true,
      message: 'Taller registrado correctamente',
      taller_id: taller.id,
      user_id: authData.user.id,
    })

  } catch (error: any) {
    console.error('❌ Error en registro:', error.message, error.stack)
    return NextResponse.json(
      { error: error.message || 'Error al registrar' },
      { status: 500 }
    )
  }
}
