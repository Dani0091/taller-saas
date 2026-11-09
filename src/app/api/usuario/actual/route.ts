/**
 * API ROUTE: USUARIO DE LA SESIÓN
 *
 * GET /api/usuario/actual - Perfil del usuario autenticado (id, email,
 * taller, nombre y rol). Lo usa TallerContext en lugar de leer la tabla
 * usuarios desde el navegador.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 })
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, email, taller_id, nombre, rol')
      .eq('email', user.email)
      .single()

    if (!usuario) {
      return NextResponse.json({ error: 'No se pudo obtener datos del usuario' }, { status: 404 })
    }

    return NextResponse.json(usuario)
  } catch (error) {
    console.error('Error obteniendo el usuario de la sesión:', error)
    return NextResponse.json({ error: 'Error de autenticación' }, { status: 500 })
  }
}
