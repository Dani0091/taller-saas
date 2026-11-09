/**
 * API ROUTE: FACTURAS DE UN TRIMESTRE (exportación para Hacienda)
 *
 * GET /api/facturas/exportar?trimestre=2026-T4 - Facturas expedidas en el
 * trimestre (todas salvo borradores; las anuladas van marcadas) con los datos
 * del libro de facturas emitidas y el plazo de presentación. Siempre del
 * taller de la sesión.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'
import { trimestreDeClave, rangoTrimestre, plazoPresentacion, etiquetaTrimestre } from '@/lib/facturas/trimestres'

const LOTE = 1000

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)

    const trimestre = trimestreDeClave(request.nextUrl.searchParams.get('trimestre') ?? '')
    if (!trimestre) {
      return NextResponse.json({ error: 'Trimestre no válido (formato AAAA-T1..T4)' }, { status: 400 })
    }
    const { desde, hasta } = rangoTrimestre(trimestre)

    const supabase = await createClient()
    const facturas: Record<string, unknown>[] = []
    // PostgREST devuelve como mucho 1000 filas por petición
    for (let desdeFila = 0; ; desdeFila += LOTE) {
      const { data, error } = await supabase
        .from('facturas')
        .select('id, numero_factura, fecha_emision, estado, es_simplificada, base_imponible, iva_porcentaje, iva, total, cliente:cliente_id(nombre, apellidos, nif)')
        .eq('taller_id', auth.tallerId)
        .is('deleted_at', null)
        .neq('estado', 'borrador')
        .not('numero_factura', 'is', null)
        .gte('fecha_emision', desde)
        .lte('fecha_emision', hasta)
        .order('fecha_emision', { ascending: true })
        .order('numero_factura', { ascending: true })
        .range(desdeFila, desdeFila + LOTE - 1)
      if (error) throw error
      facturas.push(...(data ?? []))
      if (!data || data.length < LOTE) break
    }

    return NextResponse.json({
      trimestre: etiquetaTrimestre(trimestre),
      desde,
      hasta,
      plazo: plazoPresentacion(trimestre),
      facturas: facturas.map((f) => {
        const c = f.cliente as { nombre?: string | null; apellidos?: string | null; nif?: string | null } | null
        return {
          id: f.id,
          numero_factura: f.numero_factura,
          fecha_emision: f.fecha_emision,
          estado: f.estado,
          es_simplificada: f.es_simplificada,
          base_imponible: f.base_imponible,
          iva_porcentaje: f.iva_porcentaje,
          iva: f.iva,
          total: f.total,
          cliente_nombre: c ? [c.nombre, c.apellidos].filter(Boolean).join(' ') : null,
          // NIF genérico de clientes sin NIF (ver NIF.vo): no se exporta
          cliente_nif: c?.nif && c.nif !== '00000000T' ? c.nif : null,
        }
      }),
    })
  } catch (error) {
    console.error('Error exportando el trimestre:', error)
    return NextResponse.json({ error: 'Error al preparar la exportación' }, { status: 500 })
  }
}
