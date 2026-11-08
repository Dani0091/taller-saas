import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'

// El taller sale de la sesión; el parámetro ?taller_id se ignora (antes permitía
// pedir los clientes de cualquier taller sin sesión).
export async function GET(_request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('clientes')
      // telefono: el formulario de citas lo usa para enviar la cita por WhatsApp
      .select('id, nombre, nif, telefono')
      .eq('taller_id', auth.tallerId)

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
