'use server'

import { createClient } from '@/lib/supabase/server'
import { OrdenConRelaciones } from './types'

export async function obtenerOrdenes(limit = 50) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('ordenes_reparacion')
      .select(`
        id,
        numero_orden,
        estado,
        cliente_id,
        clientes(nombre, telefono),
        vehiculo_id,
        vehiculos(marca, modelo, matricula),
        fecha_entrada,
        total_con_iva
      `)
      .order('fecha_entrada', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return data || []
  } catch (err: any) {
    throw new Error(err.message)
  }
}

export async function obtenerOrden(id: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('ordenes_reparacion')
      .select(`
        *,
        clientes(nombre, telefono, email, nif),
        vehiculos(marca, modelo, matricula)
      `)
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    return data as OrdenConRelaciones
  } catch (err: any) {
    throw new Error(err.message)
  }
}

export async function crearOrden(orden: any) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('ordenes_reparacion')
      .insert([orden])
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  } catch (err: any) {
    throw new Error(err.message)
  }
}

export async function actualizarOrden(id: string, updates: any) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('ordenes_reparacion')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  } catch (err: any) {
    throw new Error(err.message)
  }
}

export async function actualizarEstado(id: string, estado: string) {
  return actualizarOrden(id, { estado })
}

export async function eliminarOrden(id: string) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('ordenes_reparacion')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return true
  } catch (err: any) {
    throw new Error(err.message)
  }
}
