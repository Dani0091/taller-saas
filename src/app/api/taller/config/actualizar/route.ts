import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      taller_id,
      tarifa_hora,
      incluye_iva,
      porcentaje_iva,
      tarifa_con_iva,
      nombre_empresa,
      cif,
      direccion,
      telefono,
      email,
      logo_url,
      // Campos de facturación
      serie_factura,
      numero_factura_inicial,
      iban,
      condiciones_pago,
      notas_factura,
      // Colores de marca
      color_primario,
      color_secundario,
    } = body

    if (!taller_id) {
      return NextResponse.json(
        { error: 'taller_id es requerido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verificar si existe configuración
    const { data: existing, error: checkError } = await supabase
      .from('taller_config')
      .select('id')
      .eq('taller_id', taller_id)
      .single()

    // Solo incluir campos que no sean undefined
    const configData: Record<string, any> = {}
    if (tarifa_hora !== undefined) configData.tarifa_hora = tarifa_hora
    if (incluye_iva !== undefined) configData.incluye_iva = incluye_iva
    if (porcentaje_iva !== undefined) configData.porcentaje_iva = porcentaje_iva
    if (tarifa_con_iva !== undefined) configData.tarifa_con_iva = tarifa_con_iva
    if (nombre_empresa !== undefined) configData.nombre_empresa = nombre_empresa
    if (cif !== undefined) configData.cif = cif
    if (direccion !== undefined) configData.direccion = direccion
    if (telefono !== undefined) configData.telefono = telefono
    if (email !== undefined) configData.email = email
    if (logo_url !== undefined) configData.logo_url = logo_url
    if (serie_factura !== undefined) configData.serie_factura = serie_factura
    if (numero_factura_inicial !== undefined) configData.numero_factura_inicial = numero_factura_inicial
    if (iban !== undefined) configData.iban = iban
    if (condiciones_pago !== undefined) configData.condiciones_pago = condiciones_pago
    if (notas_factura !== undefined) configData.notas_factura = notas_factura
    if (color_primario !== undefined) configData.color_primario = color_primario
    if (color_secundario !== undefined) configData.color_secundario = color_secundario

    let response
    if (existing && !checkError) {
      // Actualizar existente
      response = await supabase
        .from('taller_config')
        .update({
          ...configData,
          updated_at: new Date().toISOString(),
        })
        .eq('taller_id', taller_id)
        .select()
        .single()
    } else {
      // Crear nuevo
      response = await supabase
        .from('taller_config')
        .insert([{
          taller_id,
          ...configData,
        }])
        .select()
        .single()
    }

    if (response.error) {
      return NextResponse.json(
        { error: 'Error en BD', details: response.error.message, code: response.error.code },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: response.data })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error interno', details: error?.message || 'Unknown' },
      { status: 500 }
    )
  }
}
