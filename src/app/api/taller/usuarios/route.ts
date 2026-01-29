import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * GET /api/taller/usuarios
 * Obtener usuarios del taller
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const tallerId = searchParams.get('taller_id')

    if (!tallerId) {
      return NextResponse.json({ error: 'taller_id requerido' }, { status: 400 })
    }

    // Verificar que el usuario es admin del taller
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('usuarios')
      .select('taller_id, rol')
      .eq('email', user.email)
      .single()

    if (!currentUser || currentUser.taller_id !== tallerId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener usuarios del taller
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, activo, created_at')
      .eq('taller_id', tallerId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json(usuarios || [])

  } catch (error: any) {
    console.error('Error obteniendo usuarios:', error)
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

/**
 * POST /api/taller/usuarios
 * Crear nuevo usuario para el taller
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { taller_id, email, nombre, rol, password } = body

    if (!taller_id || !email || !nombre || !password) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: email, nombre, password' },
        { status: 400 }
      )
    }

    // Verificar que el usuario actual es admin del taller
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('usuarios')
      .select('taller_id, rol')
      .eq('email', user.email)
      .single()

    if (!currentUser || currentUser.taller_id !== taller_id || currentUser.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo admins pueden crear usuarios' }, { status: 403 })
    }

    // Usar admin client para crear usuario en Auth
    const supabaseAdmin = createAdminClient()

    // Verificar si el email ya existe
    const { data: existingUser } = await supabaseAdmin
      .from('usuarios')
      .select('email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 400 })
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre }
    })

    if (authError) {
      console.error('Error creando auth user:', authError)
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
    }

    // Crear usuario en tabla usuarios
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        email,
        nombre,
        rol: rol || 'operario',
        taller_id,
        activo: true
      })
      .select()
      .single()

    if (userError) {
      // Rollback: eliminar usuario auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user!.id)
      console.error('Error creando usuario:', userError)
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      usuario: newUser
    })

  } catch (error: any) {
    console.error('Error creando usuario:', error)
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}

/**
 * PATCH /api/taller/usuarios
 * Actualizar usuario del taller (rol, activo)
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { id, rol, activo, nombre } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    // Verificar que el usuario actual es admin del taller
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('usuarios')
      .select('taller_id, rol')
      .eq('email', user.email)
      .single()

    // Obtener el usuario a modificar
    const { data: targetUser } = await supabase
      .from('usuarios')
      .select('taller_id, email')
      .eq('id', id)
      .single()

    if (!currentUser || !targetUser || currentUser.taller_id !== targetUser.taller_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (currentUser.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo admins pueden modificar usuarios' }, { status: 403 })
    }

    // No permitir que un admin se quite su propio rol admin
    if (targetUser.email === user.email && rol && rol !== 'admin') {
      return NextResponse.json({ error: 'No puedes quitarte tu propio rol de admin' }, { status: 400 })
    }

    // Preparar datos de actualización
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (rol !== undefined) updateData.rol = rol
    if (activo !== undefined) updateData.activo = activo
    if (nombre !== undefined) updateData.nombre = nombre

    const { data: updatedUser, error } = await supabase
      .from('usuarios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      usuario: updatedUser
    })

  } catch (error: any) {
    console.error('Error actualizando usuario:', error)
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
  }
}

/**
 * DELETE /api/taller/usuarios
 * Eliminar usuario del taller
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    // Verificar que el usuario actual es admin del taller
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('usuarios')
      .select('taller_id, rol')
      .eq('email', user.email)
      .single()

    // Obtener el usuario a eliminar
    const { data: targetUser } = await supabase
      .from('usuarios')
      .select('taller_id, email')
      .eq('id', id)
      .single()

    if (!currentUser || !targetUser || currentUser.taller_id !== targetUser.taller_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (currentUser.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo admins pueden eliminar usuarios' }, { status: 403 })
    }

    // No permitir que un admin se elimine a sí mismo
    if (targetUser.email === user.email) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
    }

    // Desactivar en lugar de eliminar (soft delete)
    const { error } = await supabase
      .from('usuarios')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error eliminando usuario:', error)
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 })
  }
}
