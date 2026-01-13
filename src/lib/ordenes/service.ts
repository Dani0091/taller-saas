'use server'

import { createClient } from '@/lib/supabase/server'
import { OrdenConRelaciones } from './types'

export async function obtenerOrdenes(limit = 50, incluirEliminadas = false) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('ordenes_reparacion')
      .select(`
        id,
        numero_orden,
        numero_visual,
        estado,
        cliente_id,
        clientes(nombre, telefono),
        vehiculo_id,
        vehiculos(marca, modelo, matricula),
        fecha_entrada,
        total_con_iva,
        deleted_at
      `)
      .order('fecha_entrada', { ascending: false })
      .limit(limit)

    // Solo órdenes activas por defecto (excluir eliminadas)
    if (!incluirEliminadas) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query

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

export async function eliminarOrden(id: string, motivo?: string, usuarioId?: string) {
  try {
    const supabase = await createClient()

    // Borrado lógico: marcar como eliminado en lugar de DELETE
    const { error } = await supabase
      .from('ordenes_reparacion')
      .update({
        deleted_at: new Date().toISOString(),
        motivo_eliminacion: motivo || 'Eliminado por usuario',
        eliminado_por: usuarioId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw new Error(error.message)
    return true
  } catch (err: any) {
    throw new Error(err.message)
  }
}

// Restaurar orden eliminada
export async function restaurarOrden(id: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('ordenes_reparacion')
      .update({
        deleted_at: null,
        motivo_eliminacion: null,
        eliminado_por: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw new Error(error.message)
    return true
  } catch (err: any) {
    throw new Error(err.message)
  }
}

// Eliminar permanentemente (solo para admin)
export async function eliminarOrdenPermanente(id: string) {
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
