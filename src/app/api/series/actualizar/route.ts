/**
 * API ENDPOINT: Actualizar Serie de Facturación
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
        const { id, nombre, prefijo, ultimo_numero } = body

        // Validaciones
        if (!id || !nombre || !prefijo) {
            return NextResponse.json(
                { error: 'id, nombre y prefijo son requeridos' },
                { status: 400 }
            )
        }

        // Validar que el prefijo no esté vacío
        if (prefijo.trim() === '') {
            return NextResponse.json({ error: 'El prefijo no puede estar vacío' }, { status: 400 })
        }

        // Obtener la serie actual para verificar el taller_id
        const { data: serieActual, error: errorActual } = await supabase
            .from('series_facturacion')
            .select('taller_id, prefijo')
            .eq('id', id)
            .single()

        if (errorActual || !serieActual) {
            return NextResponse.json({ error: 'Serie no encontrada' }, { status: 404 })
        }

        // Si se cambió el prefijo, verificar que no exista otro con ese prefijo
        if (prefijo !== serieActual.prefijo) {
            const { data: existente } = await supabase
                .from('series_facturacion')
                .select('id')
                .eq('taller_id', serieActual.taller_id)
                .eq('prefijo', prefijo)
                .neq('id', id)
                .single()

            if (existente) {
                return NextResponse.json(
                    { error: `Ya existe otra serie con el prefijo "${prefijo}"` },
                    { status: 409 }
                )
            }
        }

        // Actualizar la serie
        const updateData: any = { nombre, prefijo }
        if (ultimo_numero !== undefined && ultimo_numero !== null) {
            updateData.ultimo_numero = ultimo_numero
        }

        const { data: serie, error } = await supabase
            .from('series_facturacion')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            return NextResponse.json(
                { error: 'Error al actualizar serie', details: error.message },
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
