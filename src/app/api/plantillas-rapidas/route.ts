/**
 * API: Plantillas Rápidas
 * GET  → Lista plantillas activas del taller
 * POST → Crea nueva plantilla
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'

export async function GET() {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('plantillas_rapidas')
      .select('id, nombre, descripcion_operacion, lineas_items, precio_total_estimado, orden_display')
      .eq('taller_id', auth.tallerId)
      .eq('activa', true)
      .order('orden_display', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)

    const supabase = await createClient()
    const body = await request.json()
    const { nombre, descripcion_operacion, lineas_items, precio_total_estimado } = body

    if (!nombre) {
      return NextResponse.json({ error: 'nombre es requerido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('plantillas_rapidas')
      .insert([{
        taller_id: auth.tallerId,
        nombre,
        descripcion_operacion: descripcion_operacion ?? null,
        lineas_items: lineas_items ?? [],
        precio_total_estimado: precio_total_estimado ?? 0,
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
