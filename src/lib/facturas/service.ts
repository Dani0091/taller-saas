import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function obtenerFacturas(tallerId: string, filtros?: {
  estado?: string
  fechaDesde?: string
  fechaHasta?: string
  clienteId?: string
}) {
  let query = supabase
    .from('facturas')
    .select(`
      *,
      cliente:clientes(id, nombre, nif),
      lineas:lineas_factura(*)
    `)
    .eq('taller_id', tallerId)
    .order('fecha_emision', { ascending: false })

  if (filtros?.estado) {
    query = query.eq('estado', filtros.estado)
  }
  if (filtros?.clienteId) {
    query = query.eq('cliente_id', filtros.clienteId)
  }
  if (filtros?.fechaDesde) {
    query = query.gte('fecha_emision', filtros.fechaDesde)
  }
  if (filtros?.fechaHasta) {
    query = query.lte('fecha_emision', filtros.fechaHasta)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error al obtener facturas:', error)
    throw error
  }

  return data
}

export async function obtenerFactura(id: string) {
  const { data, error } = await supabase
    .from('facturas')
    .select(`
      *,
      cliente:clientes(*),
      lineas:lineas_factura(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error al obtener factura:', error)
    throw error
  }

  return data
}

export async function crearFactura(factura: any) {
  const { data, error } = await supabase
    .from('facturas')
    .insert([factura])
    .select()

  if (error) {
    console.error('Error al crear factura:', error)
    throw error
  }

  return data[0]
}

export async function actualizarFactura(id: string, updates: any) {
  const { data, error } = await supabase
    .from('facturas')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error al actualizar factura:', error)
    throw error
  }

  return data[0]
}

export async function eliminarFactura(id: string) {
  const { error } = await supabase
    .from('facturas')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error al eliminar factura:', error)
    throw error
  }

  return true
}

export async function obtenerConfiguracion(tallerId: string) {
  const { data, error } = await supabase
    .from('configuracion_taller')
    .select('*')
    .eq('taller_id', tallerId)
    .single()

  if (error) {
    console.error('Error al obtener configuración:', error)
    return null
  }

  return data
}

export async function obtenerProximoNumeroFactura(tallerId: string, serie: string = 'FA') {
  const { data, error } = await supabase
    .from('facturas')
    .select('numero_factura')
    .eq('taller_id', tallerId)
    .like('numero_factura', `${serie}%`)
    .order('numero_factura', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
    return `${serie}001`
  }

  const ultimoNumero = data[0].numero_factura
  const numero = parseInt(ultimoNumero.replace(serie, '')) + 1
  return `${serie}${numero.toString().padStart(3, '0')}`
}
