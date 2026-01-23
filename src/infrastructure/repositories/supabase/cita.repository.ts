/**
 * @fileoverview Repository: Supabase Cita Repository
 * @description Implementación concreta del repositorio de citas usando Supabase
 *
 * PRINCIPIOS:
 * - Multi-tenancy: TODAS las consultas filtran por taller_id
 * - Error handling: Usa SupabaseErrorMapper
 * - Mapeo: Usa CitaMapper para conversiones
 * - Seguridad: Respeta RLS de Supabase
 * - Soft delete: No elimina físicamente
 */

import { createClient } from '@/lib/supabase/server'
import { CitaEntity } from '@/domain/entities'
import { TipoCita, EstadoCita } from '@/domain/types'
import { NotFoundError } from '@/domain/errors'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { CitaMapper } from '@/infrastructure/mappers/cita.mapper'
import type {
  ICitaRepository,
  CitaFiltros,
  PaginacionOpciones,
  ResultadoPaginado
} from '@/application/ports/cita.repository.interface'

export class SupabaseCitaRepository implements ICitaRepository {
  /**
   * Crea una nueva cita en la base de datos
   */
  async crear(cita: CitaEntity, tallerId: string): Promise<CitaEntity> {
    try {
      const supabase = await createClient()

      // Convertir entity a formato de BD
      const citaData = CitaMapper.toPersistence(cita)

      // Validar seguridad: la cita debe pertenecer al taller
      if (citaData.taller_id !== tallerId) {
        throw new Error('Violación de seguridad: taller_id no coincide')
      }

      // Insertar cita
      const { data: citaInsertada, error: citaError } = await supabase
        .from('citas')
        .insert(citaData)
        .select()
        .single()

      if (citaError) {
        throw SupabaseErrorMapper.toDomainError(citaError)
      }

      // Obtener la cita completa
      return await this.obtenerPorId(citaInsertada.id, tallerId) as CitaEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene una cita por su ID
   * CRÍTICO: Incluye filtro de seguridad por tallerId
   */
  async obtenerPorId(id: string, tallerId: string): Promise<CitaEntity | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('citas')
        .select('*')
        .eq('id', id)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return CitaMapper.toDomain(data)

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Actualiza una cita existente
   */
  async actualizar(cita: CitaEntity, tallerId: string): Promise<CitaEntity> {
    try {
      const supabase = await createClient()

      // Verificar que la cita existe y pertenece al taller
      const citaExistente = await this.obtenerPorId(cita.getId(), tallerId)
      if (!citaExistente) {
        throw new NotFoundError('cita', cita.getId())
      }

      // Convertir entity a formato de BD
      const citaData = CitaMapper.toPersistence(cita)

      // Actualizar cita
      const { error: citaError } = await supabase
        .from('citas')
        .update(citaData)
        .eq('id', cita.getId())
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      if (citaError) {
        throw SupabaseErrorMapper.toDomainError(citaError)
      }

      // Obtener la cita actualizada
      return await this.obtenerPorId(cita.getId(), tallerId) as CitaEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Elimina una cita (soft delete)
   */
  async eliminar(id: string, tallerId: string): Promise<void> {
    try {
      const supabase = await createClient()

      // Verificar que la cita existe y pertenece al taller
      const cita = await this.obtenerPorId(id, tallerId)
      if (!cita) {
        throw new NotFoundError('cita', id)
      }

      // Soft delete
      const { error } = await supabase
        .from('citas')
        .update({
          deleted_at: new Date().toISOString(),
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
   * Restaura una cita eliminada
   */
  async restaurar(id: string, tallerId: string): Promise<CitaEntity> {
    try {
      const supabase = await createClient()

      // Verificar que la cita existe
      const { data, error: fetchError } = await supabase
        .from('citas')
        .select('*')
        .eq('id', id)
        .eq('taller_id', tallerId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new NotFoundError('cita', id)
        }
        throw SupabaseErrorMapper.toDomainError(fetchError)
      }

      // Restaurar
      const { error } = await supabase
        .from('citas')
        .update({
          deleted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('taller_id', tallerId)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Retornar cita restaurada
      return await this.obtenerPorId(id, tallerId) as CitaEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Lista citas con filtros y paginación
   */
  async listar(
    filtros: CitaFiltros,
    paginacion: PaginacionOpciones,
    tallerId: string
  ): Promise<ResultadoPaginado<CitaEntity>> {
    try {
      const supabase = await createClient()

      // Construir query base
      let query = supabase
        .from('citas')
        .select('*', { count: 'exact' })
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      // Filtrar eliminados por defecto
      if (!filtros.incluirEliminadas) {
        query = query.is('deleted_at', null)
      }

      // Aplicar filtros
      if (filtros.clienteId) {
        query = query.eq('cliente_id', filtros.clienteId)
      }

      if (filtros.vehiculoId) {
        query = query.eq('vehiculo_id', filtros.vehiculoId)
      }

      if (filtros.ordenId) {
        query = query.eq('orden_id', filtros.ordenId)
      }

      if (filtros.tipo) {
        query = query.eq('tipo', filtros.tipo)
      }

      if (filtros.estado) {
        query = query.eq('estado', filtros.estado)
      }

      if (filtros.fechaDesde) {
        query = query.gte('fecha_inicio', filtros.fechaDesde.toISOString())
      }

      if (filtros.fechaHasta) {
        query = query.lte('fecha_inicio', filtros.fechaHasta.toISOString())
      }

      // Ordenar por fecha de inicio
      query = query.order('fecha_inicio', { ascending: true })

      // Aplicar paginación
      const from = (paginacion.page - 1) * paginacion.pageSize
      const to = from + paginacion.pageSize - 1

      query = query.range(from, to)

      // Ejecutar query
      const { data, error, count } = await query

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Mapear resultados
      const citas = (data || []).map(record => CitaMapper.toDomain(record))

      return {
        data: citas,
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
   * Obtiene citas de un cliente específico
   */
  async listarPorCliente(
    clienteId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>> {
    return this.listar(
      { clienteId },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene citas de un vehículo específico
   */
  async listarPorVehiculo(
    vehiculoId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>> {
    return this.listar(
      { vehiculoId },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene citas de una orden específica
   */
  async listarPorOrden(
    ordenId: string,
    tallerId: string
  ): Promise<CitaEntity[]> {
    const resultado = await this.listar(
      { ordenId },
      { page: 1, pageSize: 100 },
      tallerId
    )
    return resultado.data
  }

  /**
   * Obtiene citas de hoy
   */
  async listarHoy(tallerId: string): Promise<CitaEntity[]> {
    try {
      const supabase = await createClient()

      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const mañana = new Date(hoy)
      mañana.setDate(mañana.getDate() + 1)

      const { data, error } = await supabase
        .from('citas')
        .select('*')
        .eq('taller_id', tallerId)
        .gte('fecha_inicio', hoy.toISOString())
        .lt('fecha_inicio', mañana.toISOString())
        .is('deleted_at', null)
        .order('fecha_inicio', { ascending: true })

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return CitaMapper.toDomainList(data || [])

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene citas por rango de fechas
   */
  async listarPorRangoFechas(
    fechaDesde: Date,
    fechaHasta: Date,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>> {
    return this.listar(
      { fechaDesde, fechaHasta },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene citas pendientes
   */
  async listarPendientes(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>> {
    return this.listar(
      { estado: EstadoCita.PENDIENTE },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene citas confirmadas
   */
  async listarConfirmadas(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>> {
    return this.listar(
      { estado: EstadoCita.CONFIRMADA },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene citas vencidas (pasadas y no completadas)
   */
  async listarVencidas(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>> {
    try {
      const supabase = await createClient()

      const ahora = new Date()

      let query = supabase
        .from('citas')
        .select('*', { count: 'exact' })
        .eq('taller_id', tallerId)
        .lt('fecha_inicio', ahora.toISOString())
        .neq('estado', EstadoCita.COMPLETADA)
        .is('deleted_at', null)

      // Aplicar paginación
      const from = (paginacion.page - 1) * paginacion.pageSize
      const to = from + paginacion.pageSize - 1

      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      const citas = (data || []).map(record => CitaMapper.toDomain(record))

      return {
        data: citas,
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
   * Obtiene citas activas (no eliminadas)
   */
  async listarActivas(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>> {
    return this.listar(
      { incluirEliminadas: false },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene citas eliminadas
   */
  async listarEliminadas(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>> {
    try {
      const supabase = await createClient()

      let query = supabase
        .from('citas')
        .select('*', { count: 'exact' })
        .eq('taller_id', tallerId)
        .not('deleted_at', 'is', null) // Solo eliminadas

      // Aplicar paginación
      const from = (paginacion.page - 1) * paginacion.pageSize
      const to = from + paginacion.pageSize - 1

      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      const citas = (data || []).map(record => CitaMapper.toDomain(record))

      return {
        data: citas,
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
   * Cuenta citas por estado
   */
  async contarPorEstado(tallerId: string): Promise<Record<EstadoCita, number>> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('citas')
        .select('estado')
        .eq('taller_id', tallerId)
        .is('deleted_at', null)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Contar por estado
      const counts: Record<string, number> = {}
      Object.values(EstadoCita).forEach(estado => {
        counts[estado] = 0
      })

      data?.forEach(record => {
        counts[record.estado] = (counts[record.estado] || 0) + 1
      })

      return counts as Record<EstadoCita, number>

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Cuenta citas por tipo
   */
  async contarPorTipo(tallerId: string): Promise<Record<TipoCita, number>> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('citas')
        .select('tipo')
        .eq('taller_id', tallerId)
        .is('deleted_at', null)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Contar por tipo
      const counts: Record<string, number> = {}
      Object.values(TipoCita).forEach(tipo => {
        counts[tipo] = 0
      })

      data?.forEach(record => {
        counts[record.tipo] = (counts[record.tipo] || 0) + 1
      })

      return counts as Record<TipoCita, number>

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Cuenta citas totales y por estado
   */
  async contarEstadisticas(tallerId: string): Promise<{
    total: number
    pendientes: number
    confirmadas: number
    completadas: number
    canceladas: number
    hoy: number
    vencidas: number
    eliminadas: number
  }> {
    try {
      const supabase = await createClient()

      // Obtener todas las citas (incluyendo eliminadas)
      const { data, error } = await supabase
        .from('citas')
        .select('estado, fecha_inicio, deleted_at')
        .eq('taller_id', tallerId)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      const citas = data || []

      const ahora = new Date()
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const mañana = new Date(hoy)
      mañana.setDate(mañana.getDate() + 1)

      const stats = {
        total: 0,
        pendientes: 0,
        confirmadas: 0,
        completadas: 0,
        canceladas: 0,
        hoy: 0,
        vencidas: 0,
        eliminadas: 0
      }

      citas.forEach(c => {
        if (c.deleted_at) {
          stats.eliminadas++
        } else {
          stats.total++
          if (c.estado === EstadoCita.PENDIENTE) stats.pendientes++
          if (c.estado === EstadoCita.CONFIRMADA) stats.confirmadas++
          if (c.estado === EstadoCita.COMPLETADA) stats.completadas++
          if (c.estado === EstadoCita.CANCELADA) stats.canceladas++

          const fechaInicio = new Date(c.fecha_inicio)
          if (fechaInicio >= hoy && fechaInicio < mañana) {
            stats.hoy++
          }
          if (fechaInicio < ahora && c.estado !== EstadoCita.COMPLETADA) {
            stats.vencidas++
          }
        }
      })

      return stats

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Marca recordatorio como enviado
   */
  async marcarRecordatorioEnviado(id: string, tallerId: string): Promise<void> {
    try {
      const supabase = await createClient()

      const { error } = await supabase
        .from('citas')
        .update({
          recordatorio_enviado: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('taller_id', tallerId)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }
}
