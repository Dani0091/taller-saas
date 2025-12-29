import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const tallerId = request.nextUrl.searchParams.get('taller_id')

    const diagnostico = {
      timestamp: new Date().toISOString(),
      tallerId,
      conexion: '✅ Conectado a Supabase',
      tests: []
    }

    // Test 1: Contar clientes
    const { data: clientes, error: error1 } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })

    diagnostico.tests.push({
      nombre: 'Total de clientes en BD',
      resultado: clientes?.length || 0,
      error: error1?.message
    })

    // Test 2: Clientes de este taller
    if (tallerId) {
      const { data: clientesTaller, error: error2 } = await supabase
        .from('clientes')
        .select('id, nombre, nif')
        .eq('taller_id', tallerId)

      diagnostico.tests.push({
        nombre: `Clientes del taller ${tallerId}`,
        cantidad: clientesTaller?.length || 0,
        datos: clientesTaller,
        error: error2?.message
      })
    }

    return NextResponse.json(diagnostico, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
