/**
 * API ROUTE: BÚSQUEDA GLOBAL (buscador Ctrl+K)
 *
 * GET /api/buscar?q=texto - Hasta 5 resultados de órdenes, vehículos,
 * clientes y facturas del taller de la sesión. Busca por número, matrícula,
 * nombre, NIF o teléfono. Mínimo 2 caracteres.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'
import { textoBusqueda } from '@/infrastructure/repositories/supabase/factura.repository'

const MAX = 5

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)

    // Sin caracteres que rompan el filtro .or() de PostgREST
    const q = textoBusqueda(request.nextUrl.searchParams.get('q') ?? '')
    if (!q || q.length < 2) return NextResponse.json({ ordenes: [], vehiculos: [], clientes: [], facturas: [] })

    const supabase = await createClient()
    const t = auth.tallerId
    const patron = `%${q}%`
    const matricula = `%${q.toUpperCase().replace(/[\s-]/g, '')}%`

    const [clientes, vehiculos, facturas, ordenesPorNumero] = await Promise.all([
      supabase.from('clientes').select('id, nombre, apellidos, nif, telefono')
        .eq('taller_id', t).or(`nombre.ilike.${patron},apellidos.ilike.${patron},nif.ilike.${patron},telefono.ilike.${patron}`)
        .order('nombre').limit(MAX),
      supabase.from('vehiculos').select('id, matricula, marca, modelo, cliente_id')
        .eq('taller_id', t).or(`matricula.ilike.${matricula},marca.ilike.${patron},modelo.ilike.${patron}`)
        .order('matricula').limit(MAX),
      supabase.from('facturas').select('id, numero_factura, fecha_emision, total, estado, matricula, cliente:cliente_id(nombre, apellidos)')
        .eq('taller_id', t).is('deleted_at', null).or(`numero_factura.ilike.${patron},matricula.ilike.${matricula}`)
        .order('fecha_emision', { ascending: false }).limit(MAX),
      supabase.from('ordenes_reparacion').select('id, numero_orden, estado, cliente_id, vehiculo_id, clientes(nombre, apellidos), vehiculos(matricula, marca, modelo)')
        .eq('taller_id', t).is('deleted_at', null).ilike('numero_orden', patron)
        .order('created_at', { ascending: false }).limit(MAX),
    ])

    // Órdenes también por la matrícula del vehículo o el nombre del cliente encontrados
    const idsVehiculo = (vehiculos.data ?? []).map((v) => v.id)
    const idsCliente = (clientes.data ?? []).map((c) => c.id)
    let ordenes = ordenesPorNumero.data ?? []
    if (ordenes.length < MAX && (idsVehiculo.length || idsCliente.length)) {
      const filtros = [
        idsVehiculo.length ? `vehiculo_id.in.(${idsVehiculo.join(',')})` : '',
        idsCliente.length ? `cliente_id.in.(${idsCliente.join(',')})` : '',
      ].filter(Boolean).join(',')
      const { data } = await supabase.from('ordenes_reparacion')
        .select('id, numero_orden, estado, cliente_id, vehiculo_id, clientes(nombre, apellidos), vehiculos(matricula, marca, modelo)')
        .eq('taller_id', t).is('deleted_at', null).or(filtros)
        .order('created_at', { ascending: false }).limit(MAX)
      const vistos = new Set(ordenes.map((o) => o.id))
      ordenes = [...ordenes, ...(data ?? []).filter((o) => !vistos.has(o.id))].slice(0, MAX)
    }

    return NextResponse.json({
      ordenes,
      vehiculos: vehiculos.data ?? [],
      clientes: clientes.data ?? [],
      facturas: facturas.data ?? [],
    })
  } catch (error) {
    console.error('Error en la búsqueda global:', error)
    return NextResponse.json({ error: 'Error al buscar' }, { status: 500 })
  }
}
