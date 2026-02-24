/**
 * API ENDPOINT: Generar Factura Standalone
 *
 * Procesa el formulario del generador de facturas:
 * 1. Obtiene usuario y taller
 * 2. Crea/obtiene cliente
 * 3. Crea borrador de factura
 * 4. Asigna número mediante RPC atómico
 * 5. Emite la factura
 * 6. Retorna ID y número para generar PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

export async function POST(request: NextRequest) {
  try {
    // 1. AUTENTICACIÓN
    const usuario = await obtenerUsuarioConFallback()

    if (!usuario) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const tallerId = usuario.taller_id
    const supabase = await createClient()

    // 2. OBTENER DATOS DEL FORMULARIO
    const body = await request.json()
    const {
      serie,
      clienteNombre,
      clienteNIF,
      clienteDireccion,
      clienteEmail,
      fechaEmision,
      fechaVencimiento,
      lineas,
      notas,
    } = body

    // 3. VALIDACIONES BÁSICAS
    if (!clienteNombre || !clienteNIF) {
      return NextResponse.json(
        { error: 'Nombre y NIF del cliente son obligatorios' },
        { status: 400 }
      )
    }

    if (!lineas || lineas.length === 0) {
      return NextResponse.json(
        { error: 'La factura debe tener al menos una línea' },
        { status: 400 }
      )
    }

    // 4. BUSCAR O CREAR CLIENTE
    let clienteId: string

    // Buscar cliente existente por NIF
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('taller_id', tallerId)
      .eq('nif', clienteNIF.toUpperCase())
      .is('deleted_at', null)
      .maybeSingle()

    if (clienteExistente) {
      clienteId = clienteExistente.id
      console.log('✅ Cliente existente encontrado:', clienteId)
    } else {
      // Crear nuevo cliente
      const { data: nuevoCliente, error: clienteError } = await supabase
        .from('clientes')
        .insert({
          taller_id: tallerId,
          nombre: clienteNombre,
          nif: clienteNIF.toUpperCase(),
          direccion: clienteDireccion || null,
          email: clienteEmail || null,
          estado: 'activo',
          tipo_cliente: 'particular',
          forma_pago: 'efectivo',
          dias_pago: 0,
        })
        .select('id')
        .single()

      if (clienteError) {
        console.error('Error creando cliente:', clienteError)
        return NextResponse.json(
          { error: 'Error al crear cliente: ' + clienteError.message },
          { status: 500 }
        )
      }

      clienteId = nuevoCliente.id
      console.log('✅ Nuevo cliente creado:', clienteId)
    }

    // 5. CALCULAR TOTALES
    let baseImponible = 0
    let totalIVA = 0

    lineas.forEach((linea: any) => {
      const base = linea.cantidad * linea.precioUnitario * (1 - linea.descuento / 100)
      baseImponible += base
      totalIVA += base * (linea.iva / 100)
    })

    const total = baseImponible + totalIVA

    // 6. CREAR FACTURA EN BORRADOR
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .insert({
        taller_id: tallerId,
        cliente_id: clienteId,
        tipo: 'normal',
        estado: 'borrador',
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento || null,
        base_imponible: baseImponible,
        iva: totalIVA,
        iva_porcentaje: 21, // Calcular promedio o usar valor predominante
        total: total,
        porcentaje_retencion: 0,
        notas: notas || null,
        estado_verifactu: 'pendiente',
        created_by: usuario.id,
      })
      .select('id')
      .single()

    if (facturaError) {
      console.error('Error creando factura:', facturaError)
      return NextResponse.json(
        { error: 'Error al crear factura: ' + facturaError.message },
        { status: 500 }
      )
    }

    const facturaId = factura.id
    console.log('✅ Factura creada en borrador:', facturaId)

    // 7. CREAR LÍNEAS DE FACTURA
    const lineasParaInsertar = lineas.map((linea: any) => {
      const base = linea.cantidad * linea.precioUnitario * (1 - linea.descuento / 100)
      const importeTotal = base * (1 + linea.iva / 100)

      return {
        factura_id: facturaId,
        tipo_linea: 'otro',
        descripcion: linea.descripcion,
        cantidad: linea.cantidad,
        precio_unitario: linea.precioUnitario,
        descuento_porcentaje: linea.descuento,
        descuento_importe: (linea.cantidad * linea.precioUnitario * linea.descuento) / 100,
        iva_porcentaje: linea.iva,
        importe_total: importeTotal,
      }
    })

    const { error: lineasError } = await supabase
      .from('detalles_factura')
      .insert(lineasParaInsertar)

    if (lineasError) {
      console.error('Error creando líneas:', lineasError)
      // Intentar eliminar la factura (rollback manual)
      await supabase.from('facturas').delete().eq('id', facturaId)

      return NextResponse.json(
        { error: 'Error al crear líneas de factura: ' + lineasError.message },
        { status: 500 }
      )
    }

    console.log(`✅ ${lineas.length} líneas creadas`)

    // 8. ASIGNAR NÚMERO DE FACTURA MEDIANTE RPC ATÓMICO
    const año = new Date(fechaEmision).getFullYear()

    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('asignar_numero_factura', {
        p_taller_id: tallerId,
        p_serie: serie,
        p_año: año,
      })

    if (rpcError) {
      console.error('Error asignando número:', rpcError)
      return NextResponse.json(
        { error: 'Error al asignar número de factura: ' + rpcError.message },
        { status: 500 }
      )
    }

    const numeroCompleto = rpcResult.numero_completo
    console.log('✅ Número asignado:', numeroCompleto)

    // 9. EMITIR LA FACTURA (cambiar estado a emitida)
    const { error: emitirError } = await supabase
      .from('facturas')
      .update({
        numero_factura: numeroCompleto,
        numero_serie: serie,
        estado: 'emitida',
        emitida_by: usuario.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', facturaId)
      .eq('taller_id', tallerId)

    if (emitirError) {
      console.error('Error emitiendo factura:', emitirError)
      return NextResponse.json(
        { error: 'Error al emitir factura: ' + emitirError.message },
        { status: 500 }
      )
    }

    console.log('✅ Factura emitida exitosamente')

    // 10. RETORNAR RESULTADO
    return NextResponse.json({
      success: true,
      facturaId,
      numeroFactura: numeroCompleto,
      serie,
      total,
    })

  } catch (error: any) {
    console.error('❌ Error en generar-standalone:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
