/**
 * API ENDPOINT: Eliminar Serie de Facturación
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
        const { id } = body

        if (!id) {
            return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
        }

        // Verificar que la serie existe
        const { data: serie, error: errorSerie } = await supabase
            .from('series_facturacion')
            .select('prefijo')
            .eq('id', id)
            .single()

        if (errorSerie || !serie) {
            return NextResponse.json({ error: 'Serie no encontrada' }, { status: 404 })
        }

        // Verificar si hay facturas usando esta serie
        const { data: facturas, error: errorFacturas } = await supabase
            .from('facturas')
            .select('id')
            .eq('numero_serie', serie.prefijo)
            .limit(1)

        if (errorFacturas) {
            return NextResponse.json(
                { error: 'Error al verificar facturas', details: errorFacturas.message },
                { status: 500 }
            )
        }

        if (facturas && facturas.length > 0) {
            return NextResponse.json(
                { error: 'No se puede eliminar una serie que tiene facturas asociadas' },
                { status: 409 }
            )
        }

        // Eliminar la serie
        const { error } = await supabase
            .from('series_facturacion')
            .delete()
            .eq('id', id)

        if (error) {
            return NextResponse.json(
                { error: 'Error al eliminar serie', details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Error interno', details: error?.message || 'Unknown error' },
            { status: 500 }
        )
    }
}
