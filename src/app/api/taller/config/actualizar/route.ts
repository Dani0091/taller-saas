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
      .from('configuracion_taller')
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
    if (serie_factura !== undefined) configData.serie_factura_default = serie_factura
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
        .from('configuracion_taller')
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
        .from('configuracion_taller')
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

    // SINCRONIZAR SERIE CON TABLA series_facturacion
    // Si se configura una serie, asegurarse de que exista en la tabla de series
    if (serie_factura) {
      const prefijo = serie_factura.toUpperCase().trim()

      // Verificar si ya existe la serie
      const { data: serieExistente } = await supabase
        .from('series_facturacion')
        .select('id, ultimo_numero')
        .eq('taller_id', taller_id)
        .eq('prefijo', prefijo)
        .single()

      if (!serieExistente) {
        // Crear la serie si no existe
        const numeroInicial = (numero_factura_inicial || 1) - 1 // Restamos 1 porque se incrementa al crear factura

        await supabase
          .from('series_facturacion')
          .insert([{
            taller_id,
            nombre: `Serie ${prefijo}`,
            prefijo: prefijo,
            ultimo_numero: numeroInicial >= 0 ? numeroInicial : 0
          }])
      } else if (numero_factura_inicial !== undefined) {
        // Si existe y se especifica un número inicial, actualizar el último número
        const nuevoUltimoNumero = (numero_factura_inicial || 1) - 1
        if (nuevoUltimoNumero >= 0) {
          await supabase
            .from('series_facturacion')
            .update({ ultimo_numero: nuevoUltimoNumero })
            .eq('id', serieExistente.id)
        }
      }
    }

    return NextResponse.json({ success: true, data: response.data })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error interno', details: error?.message || 'Unknown' },
      { status: 500 }
    )
  }
}
