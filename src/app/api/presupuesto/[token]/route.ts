/**
 * API ENDPOINT: Obtener presupuesto público por token
 *
 * Permite acceso sin autenticación para que el cliente
 * pueda ver y aceptar el presupuesto
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Función para crear cliente admin
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variables de entorno de Supabase no configuradas')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabaseAdmin = getSupabaseAdmin()

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      )
    }

    // Obtener orden por token público
    const { data: orden, error: ordenError } = await supabaseAdmin
      .from('ordenes_reparacion')
      .select('*')
      .eq('token_publico', token)
      .single()

    if (ordenError || !orden) {
      return NextResponse.json(
        { error: 'Presupuesto no encontrado o enlace inválido' },
        { status: 404 }
      )
    }

    // Verificar que se ha enviado el presupuesto
    if (!orden.fecha_envio_presupuesto) {
      return NextResponse.json(
        { error: 'Este presupuesto aún no ha sido compartido' },
        { status: 403 }
      )
    }

    // Obtener cliente
    const { data: cliente } = await supabaseAdmin
      .from('clientes')
      .select('nombre, apellidos, telefono, email')
      .eq('id', orden.cliente_id)
      .single()

    // Obtener vehículo
    const { data: vehiculo } = await supabaseAdmin
      .from('vehiculos')
      .select('*')
      .eq('id', orden.vehiculo_id)
      .single() as { data: any }

    // Obtener taller
    const { data: taller } = await supabaseAdmin
      .from('talleres')
      .select('nombre, direccion, telefono, email')
      .eq('id', orden.taller_id)
      .single()

    // Obtener config del taller
    const { data: tallerConfig } = await supabaseAdmin
      .from('taller_config')
      .select('nombre_empresa, logo_url, direccion, telefono, email, color_primario')
      .eq('taller_id', orden.taller_id)
      .single()

    // Obtener líneas
    const { data: lineas } = await supabaseAdmin
      .from('lineas_orden')
      .select('tipo, descripcion, cantidad, precio_unitario, importe_total')
      .eq('orden_id', orden.id)
      .order('created_at')

    // Preparar respuesta (solo datos necesarios, sin info sensible)
    const presupuesto = {
      numero: orden.numero_orden,
      fechaEmision: orden.fecha_envio_presupuesto,
      fechaAceptacion: orden.fecha_aceptacion_cliente,
      aceptado: !!orden.fecha_aceptacion_cliente,

      taller: {
        nombre: tallerConfig?.nombre_empresa || taller?.nombre || 'Taller',
        direccion: tallerConfig?.direccion || taller?.direccion || '',
        telefono: tallerConfig?.telefono || taller?.telefono || '',
        email: tallerConfig?.email || taller?.email || '',
        logoUrl: tallerConfig?.logo_url || null,
        colorPrimario: tallerConfig?.color_primario || '#0ea5e9',
      },

      cliente: {
        nombre: cliente?.nombre || '',
        apellidos: cliente?.apellidos || '',
      },

      vehiculo: {
        marca: vehiculo?.marca || '',
        modelo: vehiculo?.modelo || '',
        matricula: vehiculo?.matricula || '',
        año: vehiculo?.año || null,
        color: vehiculo?.color || '',
        kilometros: vehiculo?.kilometros || orden.kilometros_entrada || null,
      },

      descripcion: orden.descripcion_problema || '',

      lineas: (lineas || []).map(l => ({
        tipo: l.tipo,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precio: l.precio_unitario,
        total: l.importe_total || (l.cantidad * l.precio_unitario),
      })),

      totales: {
        manoObra: orden.subtotal_mano_obra || 0,
        piezas: orden.subtotal_piezas || 0,
        iva: orden.iva_amount || 0,
        total: orden.total_con_iva || 0,
      },
    }

    return NextResponse.json({
      success: true,
      presupuesto,
    })
  } catch (error) {
    console.error('Error obteniendo presupuesto:', error)
    return NextResponse.json(
      { error: 'Error al obtener presupuesto' },
      { status: 500 }
    )
  }
}

// Aceptar presupuesto
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const supabaseAdmin = getSupabaseAdmin()

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      )
    }

    // Obtener IP del cliente
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Verificar que existe y no está ya aceptado
    const { data: orden, error: ordenError } = await supabaseAdmin
      .from('ordenes_reparacion')
      .select('id, fecha_aceptacion_cliente, fecha_envio_presupuesto')
      .eq('token_publico', token)
      .single()

    if (ordenError || !orden) {
      return NextResponse.json(
        { error: 'Presupuesto no encontrado' },
        { status: 404 }
      )
    }

    if (!orden.fecha_envio_presupuesto) {
      return NextResponse.json(
        { error: 'Este presupuesto aún no ha sido compartido' },
        { status: 403 }
      )
    }

    if (orden.fecha_aceptacion_cliente) {
      return NextResponse.json(
        { error: 'Este presupuesto ya fue aceptado anteriormente' },
        { status: 400 }
      )
    }

    // Actualizar orden con aceptación
    const { error: updateError } = await supabaseAdmin
      .from('ordenes_reparacion')
      .update({
        fecha_aceptacion_cliente: new Date().toISOString(),
        presupuesto_aprobado_por_cliente: true,
        ip_aceptacion: ip,
        firma_cliente: body.firma || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orden.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      mensaje: 'Presupuesto aceptado correctamente',
      fechaAceptacion: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error aceptando presupuesto:', error)
    return NextResponse.json(
      { error: 'Error al aceptar presupuesto' },
      { status: 500 }
    )
  }
}
