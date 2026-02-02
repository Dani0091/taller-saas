import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API ENDPOINT: Diagnóstico de BD
 * PROTEGIDA: Solo usuarios autenticados pueden acceder
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // SEGURIDAD: Verificar que hay usuario autenticado
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener taller_id del usuario autenticado
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('taller_id')
      .eq('email', user.email)
      .single()

    if (!usuario?.taller_id) {
      return NextResponse.json(
        { error: 'Usuario no tiene taller asignado' },
        { status: 403 }
      )
    }

    const tallerId = usuario.taller_id

    const diagnostico: {
      timestamp: string
      tallerId: string
      conexion: string
      tests: Array<{ nombre: string; cantidad?: number; estado?: string; error?: string }>
    } = {
      timestamp: new Date().toISOString(),
      tallerId,
      conexion: '✅ Conectado a Supabase',
      tests: []
    }

    // Test 1: Contar clientes del taller
    const { count: totalClientes, error: error1 } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('taller_id', tallerId)

    diagnostico.tests.push({
      nombre: 'Clientes del taller',
      cantidad: totalClientes || 0,
      error: error1?.message
    })

    // Test 2: Contar vehículos del taller
    const { count: totalVehiculos, error: error2 } = await supabase
      .from('vehiculos')
      .select('*', { count: 'exact', head: true })
      .eq('taller_id', tallerId)

    diagnostico.tests.push({
      nombre: 'Vehículos del taller',
      cantidad: totalVehiculos || 0,
      error: error2?.message
    })

    // Test 3: Contar órdenes del taller
    const { count: totalOrdenes, error: error3 } = await supabase
      .from('ordenes_reparacion')
      .select('*', { count: 'exact', head: true })
      .eq('taller_id', tallerId)

    diagnostico.tests.push({
      nombre: 'Órdenes de reparación',
      cantidad: totalOrdenes || 0,
      error: error3?.message
    })

    // Test 4: Contar facturas del taller
    const { count: totalFacturas, error: error4 } = await supabase
      .from('facturas')
      .select('*', { count: 'exact', head: true })
      .eq('taller_id', tallerId)

    diagnostico.tests.push({
      nombre: 'Facturas emitidas',
      cantidad: totalFacturas || 0,
      error: error4?.message
    })

    // Nunca exponer datos sensibles, solo conteos
    return NextResponse.json(diagnostico, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error en diagnóstico' },
      { status: 500 }
    )
  }
}
