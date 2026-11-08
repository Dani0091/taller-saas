import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'

export async function GET() {
  try {
    // Sesión obligatoria; el taller sale de la sesión (el parámetro ?taller_id se ignora).
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)
    const taller_id = auth.tallerId

    const supabase = await createClient()

    // ✅ Consultar desde taller_config
    const { data, error } = await supabase
      .from('taller_config')
      .select('*')
      .eq('taller_id', taller_id)
      .single()

    if (error) {
      // Si no existe, retornar config por defecto
      return NextResponse.json({
        id: null,
        taller_id,
        tarifa_hora: 45.00,
        incluye_iva: true,
        porcentaje_iva: 21.00,
        nombre_empresa: null,
        cif: null,
        direccion: null,
        telefono: null,
        email: null,
        logo_url: null,
        serie_factura: null,
      })
    }

    // taller_config ya tiene la columna serie_factura directamente
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error en servidor' },
      { status: 500 }
    )
  }
}
