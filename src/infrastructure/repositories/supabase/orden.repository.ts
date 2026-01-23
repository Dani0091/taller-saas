/**
 * @fileoverview Repository: Supabase Orden Repository
 * @description Implementación concreta del repositorio de órdenes usando Supabase
 *
 * PRINCIPIOS:
 * - Multi-tenancy: TODAS las consultas filtran por taller_id
 * - Error handling: Usa SupabaseErrorMapper
 * - Mapeo: Usa OrdenMapper para conversiones
 * - Seguridad: Respeta RLS de Supabase
 *
 * VENTAJA: Si mañana cambias a PostgreSQL directo, solo cambias ESTE archivo
 */

import { createClient } from '@/lib/supabase/server'
import { OrdenEntity, LineaOrdenEntity } from '@/domain/entities'
import { EstadoOrden } from '@/domain/types'
import { NotFoundError } from '@/domain/errors'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { OrdenMapper } from './orden.mapper'
import type {
  IOrdenRepository,
  OrdenFiltros,
  PaginacionOpciones,
  ResultadoPaginado
} from '@/application/ports'

export class SupabaseOrdenRepository implements IOrdenRepository {
  /**
   * Crea una nueva orden en la base de datos
   */
  async crear(orden: OrdenEntity, tallerId: string): Promise<OrdenEntity> {
    try {
      const supabase = await createClient()

      // Convertir entity a formato de BD
      const ordenData = OrdenMapper.toPersistence(orden)

      // Validar seguridad: la orden debe pertenecer al taller
      if (ordenData.taller_id !== tallerId) {
        throw new Error('Violación de seguridad: taller_id no coincide')
      }

      // Insertar orden principal
      const { data: ordenInsertada, error: ordenError } = await supabase
        .from('ordenes_reparacion')
        .insert(ordenData)
        .select()
        .single()

      if (ordenError) {
        throw SupabaseErrorMapper.toDomainError(ordenError)
      }

      // Insertar líneas si existen
      const lineas = orden.getLineas()
      if (lineas.length > 0) {
        const lineasData = lineas.map(linea => OrdenMapper.lineaToPersistence(linea))

        const { error: lineasError } = await supabase
          .from('lineas_orden')
          .insert(lineasData)

        if (lineasError) {
          // Si falla, intentar eliminar la orden (rollback manual)
          await supabase
            .from('ordenes_reparacion')
            .delete()
            .eq('id', ordenInsertada.id)

          throw SupabaseErrorMapper.toDomainError(lineasError)
        }
      }

      // Obtener la orden completa con líneas
      return await this.obtenerPorId(ordenInsertada.id, tallerId) as OrdenEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene una orden por su ID
   * CRÍTICO: Incluye filtro de seguridad por tallerId
   */
  async obtenerPorId(id: string, tallerId: string): Promise<OrdenEntity | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('ordenes_reparacion')
        .select(`
          *,
          lineas:lineas_orden(*)
        `)
        .eq('id', id)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .is('deleted_at', null) // No mostrar órdenes eliminadas
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return OrdenMapper.toDomain(data)

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene una orden por su número
   */
  async obtenerPorNumero(numeroOrden: string, tallerId: string): Promise<OrdenEntity | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('ordenes_reparacion')
        .select(`
          *,
          lineas:lineas_orden(*)
        `)
        .eq('numero_orden', numeroOrden)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .is('deleted_at', null)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return OrdenMapper.toDomain(data)

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Actualiza una orden existente
   */
  async actualizar(orden: OrdenEntity, tallerId: string): Promise<OrdenEntity> {
    try {
      const supabase = await createClient()

      // Verificar que la orden existe y pertenece al taller
      const ordenExistente = await this.obtenerPorId(orden.getId(), tallerId)
      if (!ordenExistente) {
        throw new NotFoundError('orden', orden.getId())
      }

      // Convertir entity a formato de BD
      const ordenData = OrdenMapper.toPersistence(orden)

      // Actualizar orden principal
      const { error: ordenError } = await supabase
        .from('ordenes_reparacion')
        .update(ordenData)
        .eq('id', orden.getId())
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      if (ordenError) {
        throw SupabaseErrorMapper.toDomainError(ordenError)
      }

      // Actualizar líneas (estrategia: eliminar todas y reinsertar)
      // Primero eliminar líneas existentes
      await supabase
        .from('lineas_orden')
        .delete()
        .eq('orden_id', orden.getId())

      // Insertar líneas nuevas
      const lineas = orden.getLineas()
      if (lineas.length > 0) {
        const lineasData = lineas.map(linea => OrdenMapper.lineaToPersistence(linea))

        const { error: lineasError } = await supabase
          .from('lineas_orden')
          .insert(lineasData)

        if (lineasError) {
          throw SupabaseErrorMapper.toDomainError(lineasError)
        }
      }

      // Obtener la orden actualizada
      return await this.obtenerPorId(orden.getId(), tallerId) as OrdenEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Elimina una orden (soft delete)
   */
  async eliminar(id: string, tallerId: string, userId: string): Promise<void> {
    try {
      const supabase = await createClient()

      // Verificar que la orden existe y pertenece al taller
      const orden = await this.obtenerPorId(id, tallerId)
      if (!orden) {
        throw new NotFoundError('orden', id)
      }

      // Soft delete
      const { error } = await supabase
        .from('ordenes_reparacion')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Lista órdenes con filtros y paginación
   */
  async listar(
    filtros: OrdenFiltros,
    paginacion: PaginacionOpciones,
    tallerId: string
  ): Promise<ResultadoPaginado<OrdenEntity>> {
    try {
      const supabase = await createClient()

      // Construir query base
      let query = supabase
        .from('ordenes_reparacion')
        .select(`
          *,
          lineas:lineas_orden(*)
        `, { count: 'exact' })
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .is('deleted_at', null)

      // Aplicar filtros
      if (filtros.estado) {
        query = query.eq('estado', filtros.estado)
      }

      if (filtros.clienteId) {
        query = query.eq('cliente_id', filtros.clienteId)
      }

      if (filtros.vehiculoId) {
        query = query.eq('vehiculo_id', filtros.vehiculoId)
      }

      if (filtros.operarioId) {
        query = query.eq('operario_id', filtros.operarioId)
      }

      if (filtros.fechaDesde) {
        query = query.gte('created_at', filtros.fechaDesde.toISOString())
      }

      if (filtros.fechaHasta) {
        query = query.lte('created_at', filtros.fechaHasta.toISOString())
      }

      if (filtros.busqueda) {
        // Búsqueda por número de orden o descripción
        query = query.or(
          `numero_orden.ilike.%${filtros.busqueda}%,descripcion_problema.ilike.%${filtros.busqueda}%`
        )
      }

      // Aplicar paginación
      const from = (paginacion.page - 1) * paginacion.pageSize
      const to = from + paginacion.pageSize - 1

      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data, error, count } = await query

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Mapear a entities
      const ordenes = (data || []).map(record => OrdenMapper.toDomain(record))

      return {
        data: ordenes,
        total: count || 0,
        page: paginacion.page,
        pageSize: paginacion.pageSize,
        totalPages: Math.ceil((count || 0) / paginacion.pageSize)
      }

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Cuenta órdenes por estado
   */
  async contarPorEstado(tallerId: string): Promise<Record<EstadoOrden, number>> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('ordenes_reparacion')
        .select('estado')
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .is('deleted_at', null)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Contar por estado
      const counts: Record<EstadoOrden, number> = {
        [EstadoOrden.RECIBIDO]: 0,
        [EstadoOrden.EN_DIAGNOSTICO]: 0,
        [EstadoOrden.PRESUPUESTADO]: 0,
        [EstadoOrden.APROBADO]: 0,
        [EstadoOrden.EN_PROGRESO]: 0,
        [EstadoOrden.FINALIZADO]: 0,
        [EstadoOrden.FACTURADO]: 0
      }

      data?.forEach(orden => {
        const estado = orden.estado as EstadoOrden
        if (estado in counts) {
          counts[estado]++
        }
      })

      return counts

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene el último número de orden generado
   */
  async obtenerUltimoNumeroOrden(tallerId: string, año: number): Promise<string | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('ordenes_reparacion')
        .select('numero_orden')
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .like('numero_orden', `ORD-${año}-%`)
        .order('numero_orden', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No hay órdenes para este año
        }
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return data?.numero_orden || null

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Verifica si existe un número de orden
   */
  async existeNumeroOrden(numeroOrden: string, tallerId: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('ordenes_reparacion')
        .select('id')
        .eq('numero_orden', numeroOrden)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .is('deleted_at', null)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return false
        }
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return !!data

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Lista órdenes de un cliente
   */
  async listarPorCliente(
    clienteId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<OrdenEntity>> {
    return this.listar(
      { clienteId },
      paginacion,
      tallerId
    )
  }

  /**
   * Lista órdenes de un vehículo
   */
  async listarPorVehiculo(
    vehiculoId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<OrdenEntity>> {
    return this.listar(
      { vehiculoId },
      paginacion,
      tallerId
    )
  }

  /**
   * Lista órdenes de un operario
   */
  async listarPorOperario(
    operarioId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<OrdenEntity>> {
    return this.listar(
      { operarioId },
      paginacion,
      tallerId
    )
  }
}
