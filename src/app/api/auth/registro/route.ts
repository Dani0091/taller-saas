import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

/**
 * API para registro de nuevos talleres
 * Usa service role key para bypasear RLS
 */
export async function POST(request: Request) {
  try {
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

    // Usar admin client para bypasear RLS
    const supabaseAdmin = createAdminClient()

    // 1. Verificar si el email ya existe
    const { data: existingUser } = await supabaseAdmin
      .from('usuarios')
      .select('email')
      .eq('email', email_usuario)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      )
    }

    // 2. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email_usuario,
      password: password,
      email_confirm: true, // Auto-confirmar el email
      user_metadata: {
        nombre: nombre_usuario,
      }
    })

    if (authError) {
      console.error('Error creando auth user:', authError)
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'Este email ya está registrado en el sistema' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Error al crear usuario' },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Error al crear usuario' },
        { status: 500 }
      )
    }

    // 3. Crear el taller (con admin client, bypass RLS)
    const { data: taller, error: tallerError } = await supabaseAdmin
      .from('talleres')
      .insert([{
        nombre: nombre_taller,
        cif: cif,
        direccion: direccion || null,
        telefono: telefono || null,
        email: email_taller || email_usuario,
      }])
      .select('id')
      .single()

    if (tallerError) {
      console.error('Error creando taller:', tallerError)
      // Rollback: eliminar usuario auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Error al crear el taller' },
        { status: 500 }
      )
    }

    // 4. Crear el usuario vinculado al taller (con admin client, bypass RLS)
    const { error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .insert([{
        email: email_usuario,
        nombre: nombre_usuario,
        rol: 'admin',
        taller_id: taller.id,
        activo: true,
      }])

    if (usuarioError) {
      console.error('Error creando usuario:', usuarioError)
      // Rollback: eliminar taller y usuario auth
      await supabaseAdmin.from('talleres').delete().eq('id', taller.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Error al vincular usuario al taller' },
        { status: 500 }
      )
    }

    // 5. Crear configuración por defecto del taller
    const { error: configError } = await supabaseAdmin
      .from('taller_config')
      .insert([{
        taller_id: taller.id,
        nombre_empresa: nombre_taller,
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
      }])

    if (configError) {
      console.error('Error creando config (no crítico):', configError)
      // No es crítico, continuamos
    }

    return NextResponse.json({
      success: true,
      message: 'Taller registrado correctamente',
      taller_id: taller.id,
      user_id: authData.user.id,
    })

  } catch (error: any) {
    console.error('Error en registro:', error)
    return NextResponse.json(
      { error: error.message || 'Error al registrar' },
      { status: 500 }
    )
  }
}
