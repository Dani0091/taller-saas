import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const tallerId = request.nextUrl.searchParams.get('taller_id')

    if (!tallerId) {
      return NextResponse.json([], { status: 200 })
    }

    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, nif')
      .eq('taller_id', tallerId)

    if (error) {
      console.error('Error:', error)
      return NextResponse.json([], { status: 200 })
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json([], { status: 200 })
  }
}
