import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'

export async function DELETE(request: NextRequest) {
  try {
    // Validar autenticación
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) {
      return authErrorResponse(auth)
    }

    const supabase = await createClient()
    const id = request.nextUrl.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      )
    }

    // Obtener la factura para validar su estado
    const { data: factura, error: getError } = await supabase
      .from('facturas')
      .select('estado, numero_factura')
      .eq('id', id)
      .eq('taller_id', auth.tallerId)
      .single()

    if (getError || !factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada o no tienes permiso para eliminarla' },
        { status: 404 }
      )
    }

    // VALIDACIÓN DE SEGURIDAD: Solo permitir borrar borradores
    if (factura.estado !== 'borrador') {
      return NextResponse.json(
        {
          error: `No se puede eliminar la factura ${factura.numero_factura || 'esta factura'}`,
          detalles: `La factura está en estado "${factura.estado}"`,
          razon: 'NORMATIVA ESPAÑOLA: Solo se pueden eliminar facturas en estado "borrador" para evitar huecos en la numeración correlativa',
          sugerencia: factura.estado === 'emitida' || factura.estado === 'pagada'
            ? 'Para anular una factura emitida o pagada, debes crear una NOTA DE CRÉDITO (factura rectificativa) en lugar de eliminarla.'
            : 'Contacta con soporte si necesitas eliminar esta factura por motivos excepcionales.'
        },
        { status: 403 } // 403 Forbidden
      )
    }

    // Eliminar solo si pertenece al taller del usuario y es borrador
    const { error } = await supabase
      .from('facturas')
      .delete()
      .eq('id', id)
      .eq('taller_id', auth.tallerId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
