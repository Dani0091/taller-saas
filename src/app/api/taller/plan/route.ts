import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/taller/plan
 * Obtener información del plan actual del taller
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener usuario y taller
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('taller_id, rol')
      .eq('email', user.email)
      .single()

    if (usuarioError || !usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Obtener datos del taller con plan
    const { data: taller, error: tallerError } = await supabase
      .from('talleres')
      .select(`
        id,
        nombre,
        plan_nombre,
        fecha_inicio_plan,
        fecha_fin_plan,
        dias_prueba,
        suscripcion_activa
      `)
      .eq('id', usuario.taller_id)
      .single()

    if (tallerError || !taller) {
      // Si no tiene campos de plan, devolver valores por defecto
      return NextResponse.json({
        plan_nombre: 'trial',
        plan_display: 'Prueba',
        dias_restantes: 14,
        suscripcion_activa: true,
        color: '#9ca3af',
        limites: {
          max_usuarios: 1,
          max_ordenes_mes: 10,
          max_vehiculos: 20,
          max_clientes: 20,
          max_facturas_mes: 10,
          tiene_ocr: false,
          tiene_verifactu: false,
        }
      })
    }

    // Obtener detalles del plan
    const { data: plan } = await supabase
      .from('planes')
      .select('*')
      .eq('nombre', taller.plan_nombre || 'trial')
      .single()

    // Calcular días restantes
    let diasRestantes = 14
    if (taller.fecha_fin_plan) {
      const finPlan = new Date(taller.fecha_fin_plan)
      const ahora = new Date()
      diasRestantes = Math.ceil((finPlan.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
    } else if (taller.fecha_inicio_plan) {
      const inicioPlan = new Date(taller.fecha_inicio_plan)
      const ahora = new Date()
      const diasTranscurridos = Math.floor((ahora.getTime() - inicioPlan.getTime()) / (1000 * 60 * 60 * 24))
      diasRestantes = (taller.dias_prueba || 14) - diasTranscurridos
    }

    // Configuración de planes por defecto si no existe la tabla
    const planesDefault: Record<string, any> = {
      trial: {
        nombre_display: 'Prueba',
        color: '#9ca3af',
        max_usuarios: 1,
        max_ordenes_mes: 10,
        max_vehiculos: 20,
        max_clientes: 20,
        max_facturas_mes: 10,
        tiene_ocr: false,
        tiene_verifactu: false,
      },
      basico: {
        nombre_display: 'Básico',
        color: '#3b82f6',
        max_usuarios: 2,
        max_ordenes_mes: 100,
        max_vehiculos: 200,
        max_clientes: 200,
        max_facturas_mes: 50,
        tiene_ocr: true,
        tiene_verifactu: false,
      },
      pro: {
        nombre_display: 'Profesional',
        color: '#8b5cf6',
        max_usuarios: 5,
        max_ordenes_mes: 500,
        max_vehiculos: 1000,
        max_clientes: 500,
        max_facturas_mes: 200,
        tiene_ocr: true,
        tiene_verifactu: true,
      },
      enterprise: {
        nombre_display: 'Enterprise',
        color: '#f59e0b',
        max_usuarios: 999,
        max_ordenes_mes: 9999,
        max_vehiculos: 9999,
        max_clientes: 9999,
        max_facturas_mes: 9999,
        tiene_ocr: true,
        tiene_verifactu: true,
      },
    }

    const planNombre = taller.plan_nombre || 'trial'
    const planData = plan || planesDefault[planNombre] || planesDefault.trial

    return NextResponse.json({
      plan_nombre: planNombre,
      plan_display: planData.nombre_display,
      dias_restantes: Math.max(0, diasRestantes),
      suscripcion_activa: taller.suscripcion_activa !== false,
      color: planData.color,
      limites: {
        max_usuarios: planData.max_usuarios,
        max_ordenes_mes: planData.max_ordenes_mes,
        max_vehiculos: planData.max_vehiculos,
        max_clientes: planData.max_clientes,
        max_facturas_mes: planData.max_facturas_mes,
        tiene_ocr: planData.tiene_ocr,
        tiene_verifactu: planData.tiene_verifactu,
      }
    })

  } catch (error: any) {
    console.error('Error obteniendo plan:', error)
    // Devolver valores por defecto en caso de error
    return NextResponse.json({
      plan_nombre: 'trial',
      plan_display: 'Prueba',
      dias_restantes: 14,
      suscripcion_activa: true,
      color: '#9ca3af',
      limites: {
        max_usuarios: 1,
        max_ordenes_mes: 10,
        max_vehiculos: 20,
        max_clientes: 20,
        max_facturas_mes: 10,
        tiene_ocr: false,
        tiene_verifactu: false,
      }
    })
  }
}
