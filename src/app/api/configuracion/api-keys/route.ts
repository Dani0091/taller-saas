/**
 * API ENDPOINT: Gestión de API Keys por Taller
 *
 * Permite a cada taller configurar sus propias credenciales de servicios externos
 * (Google Calendar, OCR, etc.) para aprovechar los tiers gratuitos.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Obtener configuración de API keys del taller
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar sesión
    const { data: { user }, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tallerId = searchParams.get('taller_id')

    if (!tallerId) {
      return NextResponse.json({ error: 'taller_id requerido' }, { status: 400 })
    }

    // Obtener configuración del taller
    const { data: config, error } = await supabase
      .from('taller_api_config')
      .select('google_client_id, gemini_api_key')
      .eq('taller_id', tallerId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error obteniendo config:', error)
      return NextResponse.json({ error: 'Error obteniendo configuración' }, { status: 500 })
    }

    return NextResponse.json({
      google_client_id: config?.google_client_id || null,
      // No devolvemos el secret completo, solo indicamos si existe
      google_client_secret: config?.google_client_id ? true : false,
      gemini_api_key: config?.gemini_api_key ? true : false,
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST - Guardar/actualizar configuración de API keys
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar sesión
    const { data: { user }, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { taller_id, google_client_id, google_client_secret, gemini_api_key } = body

    if (!taller_id) {
      return NextResponse.json({ error: 'taller_id requerido' }, { status: 400 })
    }

    // Verificar que el usuario pertenece al taller
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('taller_id, rol')
      .eq('auth_id', session.user.id)
      .single()

    if (!usuario || usuario.taller_id !== taller_id) {
      return NextResponse.json({ error: 'No autorizado para este taller' }, { status: 403 })
    }

    // Preparar datos para actualizar
    const updateData: Record<string, any> = {
      taller_id,
      updated_at: new Date().toISOString(),
    }

    if (google_client_id !== undefined) {
      updateData.google_client_id = google_client_id || null
    }
    if (google_client_secret !== undefined) {
      updateData.google_client_secret = google_client_secret || null
    }
    if (gemini_api_key !== undefined) {
      updateData.gemini_api_key = gemini_api_key || null
    }

    // Verificar si ya existe configuración
    const { data: existing } = await supabase
      .from('taller_api_config')
      .select('id')
      .eq('taller_id', taller_id)
      .single()

    if (existing) {
      // Actualizar
      const { error } = await supabase
        .from('taller_api_config')
        .update(updateData)
        .eq('taller_id', taller_id)

      if (error) {
        console.error('Error actualizando:', error)
        return NextResponse.json({ error: 'Error actualizando configuración' }, { status: 500 })
      }
    } else {
      // Insertar
      const { error } = await supabase
        .from('taller_api_config')
        .insert([updateData])

      if (error) {
        console.error('Error insertando:', error)
        return NextResponse.json({ error: 'Error guardando configuración' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
