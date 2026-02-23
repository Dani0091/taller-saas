/**
 * API ENDPOINT: Crear Serie de Facturación
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Verificar sesión
        const { data: { user }, error: sessionError } = await supabase.auth.getUser()
        if (sessionError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        const body = await request.json()
        const { taller_id, nombre, prefijo, ultimo_numero } = body

        // Validaciones
        if (!taller_id || !nombre || !prefijo) {
            return NextResponse.json(
                { error: 'taller_id, nombre y prefijo son requeridos' },
                { status: 400 }
            )
        }

        // Validar que el prefijo no esté vacío
        if (prefijo.trim() === '') {
            return NextResponse.json({ error: 'El prefijo no puede estar vacío' }, { status: 400 })
        }

        // Verificar que no exista ya una serie con ese prefijo para este taller
        const { data: existente } = await supabase
            .from('series_factura')
            .select('id')
            .eq('taller_id', taller_id)
            .eq('prefijo', prefijo)
            .single()

        if (existente) {
            return NextResponse.json(
                { error: `Ya existe una serie con el prefijo "${prefijo}"` },
                { status: 409 }
            )
        }

        // Crear la serie
        const { data: serie, error } = await supabase
            .from('series_factura')
            .insert([{
                taller_id,
                nombre,
                prefijo,
                año: new Date().getFullYear(),
                ultimo_numero: ultimo_numero || 0
            }])
            .select()
            .single()

        if (error) {
            return NextResponse.json(
                { error: 'Error al crear serie', details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, serie })
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Error interno', details: error?.message || 'Unknown error' },
            { status: 500 }
        )
    }
}
