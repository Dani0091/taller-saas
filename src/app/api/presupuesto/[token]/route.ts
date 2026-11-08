/**
 * API ENDPOINT: Obtener presupuesto público por token
 *
 * Permite acceso sin autenticación para que el cliente
 * pueda ver y aceptar el presupuesto
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { syncOrdenCalendarEvent } from '@/app/api/calendar/google/events/route'
import { leerJson } from '@/lib/api/leer-json'
import { cargarPresupuesto } from '@/lib/ordenes/cargar-presupuesto'

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
      .select('nombre_taller, nombre_empresa, logo_url, direccion, telefono, email, color_primario')
      .eq('taller_id', orden.taller_id)
      .single()

    // Totales EN VIVO desde las líneas (no las columnas cacheadas de la orden,
    // que solo se refrescan en un autosave general) y versión de lo que se ve:
    // la aceptación la devuelve y se rechaza si ha cambiado (A10).
    const { lineas, totales: totalesCalculados, version } = await cargarPresupuesto(supabaseAdmin, orden)

    // Preparar respuesta (solo datos necesarios, sin info sensible)
    const presupuesto = {
      numero: orden.numero_orden,
      fechaEmision: orden.fecha_envio_presupuesto,
      fechaAceptacion: orden.fecha_aceptacion_cliente,
      aceptado: !!orden.fecha_aceptacion_cliente,

      taller: {
        nombre: tallerConfig?.nombre_taller || tallerConfig?.nombre_empresa || taller?.nombre || 'Taller',
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

      lineas: lineas.map(l => ({
        tipo: l.tipo,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precio: l.precio_unitario,
        total: l.importe_total || (l.cantidad * l.precio_unitario),
      })),

      totales: {
        manoObra: totalesCalculados.manoObra,
        piezas: totalesCalculados.piezas,
        iva: totalesCalculados.iva,
        total: totalesCalculados.total,
      },
    }

    return NextResponse.json({
      success: true,
      presupuesto,
      version,
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
    const leido = await leerJson(request)
    const body = (leido && typeof leido === 'object' && !Array.isArray(leido) ? leido : {}) as { firma?: unknown; version?: unknown }
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

    // Leer estado, fechas y la versión enviada (A10) para validaciones
    const { data: orden, error: ordenError } = await supabaseAdmin
      .from('ordenes_reparacion')
      .select('id, taller_id, iva_porcentaje, estado, fecha_aceptacion_cliente, fecha_envio_presupuesto, presupuesto_hash_lineas')
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

    // Caducidad: presupuestos enviados hace más de 90 días ya no son aceptables
    const DIAS_CADUCIDAD = 90
    const diasDesdeEnvio = (Date.now() - new Date(orden.fecha_envio_presupuesto).getTime()) / 86_400_000
    if (diasDesdeEnvio > DIAS_CADUCIDAD) {
      return NextResponse.json(
        { error: `Este enlace caducó hace ${Math.floor(diasDesdeEnvio - DIAS_CADUCIDAD)} días. Solicita al taller un nuevo presupuesto.` },
        { status: 410 }
      )
    }

    // Estados terminales: no tiene sentido aprobar una orden ya cerrada
    const ESTADOS_BLOQUEANTES = ['cancelado', 'facturado', 'archivado']
    if (ESTADOS_BLOQUEANTES.includes(orden.estado)) {
      return NextResponse.json(
        { error: `La orden ya tiene estado "${orden.estado}" y no puede ser aprobada de nuevo.` },
        { status: 409 }
      )
    }

    // Idempotencia: doble clic / reintento devuelve éxito, no error
    if (orden.fecha_aceptacion_cliente) {
      return NextResponse.json({
        success: true,
        mensaje: 'Presupuesto ya estaba aceptado',
        fechaAceptacion: orden.fecha_aceptacion_cliente,
      })
    }

    // A10: el cliente acepta lo que vio. La página envía la versión que cargó;
    // un cliente sin versión (página antigua en caché) se compara con la
    // enviada por el taller. Órdenes compartidas antes de A10 no tienen versión.
    const { version: versionActual } = await cargarPresupuesto(supabaseAdmin, orden)
    const versionVista = typeof body.version === 'string' ? body.version : orden.presupuesto_hash_lineas
    if (versionVista && versionVista !== versionActual) {
      return NextResponse.json(
        {
          error: 'El presupuesto ha cambiado desde que lo abriste. Revisa la versión actual antes de aceptarlo.',
          cambiado: true,
        },
        { status: 409 }
      )
    }

    // Actualizar orden con aceptación y cambiar estado a "aprobado".
    // Se añade token_publico como segunda condición defensiva para que
    // otro código que haya cambiado el token invalide esta aceptación.
    const { error: updateError } = await supabaseAdmin
      .from('ordenes_reparacion')
      .update({
        estado: 'aprobado',
        fecha_aceptacion_cliente: new Date().toISOString(),
        presupuesto_aprobado_por_cliente: true,
        ip_aceptacion: ip,
        firma_cliente: typeof body.firma === 'string' && body.firma ? body.firma : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orden.id)
      .eq('token_publico', token)

    if (updateError) {
      throw updateError
    }

    // Sincronizar evento de Google Calendar si la orden lo tiene (best-effort, no bloquea)
    syncOrdenCalendarEvent(supabaseAdmin, orden.id, { notaExtra: 'Presupuesto aprobado por el cliente' }).catch(() => {})

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
