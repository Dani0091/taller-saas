/**
 * @fileoverview Repository: Supabase Vehiculo Repository
 * @description Implementación concreta del repositorio de vehículos usando Supabase
 *
 * PRINCIPIOS:
 * - Multi-tenancy: TODAS las consultas filtran por taller_id
 * - Error handling: Usa SupabaseErrorMapper
 * - Mapeo: Usa VehiculoMapper para conversiones
 * - Seguridad: Respeta RLS de Supabase
 * - Soft delete: No elimina físicamente
 */

import { createClient } from '@/lib/supabase/server'
import { VehiculoEntity } from '@/domain/entities'
import { TipoCombustible } from '@/domain/types'
import { NotFoundError, ConflictError } from '@/domain/errors'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { VehiculoMapper } from '@/infrastructure/mappers/vehiculo.mapper'
import type {
  IVehiculoRepository,
  VehiculoFiltros
} from '@/application/ports/vehiculo.repository.interface'
import type { PaginacionOpciones, ResultadoPaginado } from '@/application/ports/repository.types'

export class SupabaseVehiculoRepository implements IVehiculoRepository {
  /**
   * Crea un nuevo vehículo en la base de datos
   */
  async crear(vehiculo: VehiculoEntity, tallerId: string): Promise<VehiculoEntity> {
    try {
      const supabase = await createClient()

      // Convertir entity a formato de BD
      const vehiculoData = VehiculoMapper.toPersistence(vehiculo)

      // Validar seguridad: el vehículo debe pertenecer al taller
      if (vehiculoData.taller_id !== tallerId) {
        throw new Error('Violación de seguridad: taller_id no coincide')
      }

      // Verificar que no exista otro vehículo con la misma matrícula
      const existeMatricula = await this.existeMatricula(
        vehiculo.getMatricula().valor,
        tallerId
      )
      if (existeMatricula) {
        throw new ConflictError('Vehículo', 'matrícula', vehiculo.getMatricula().valor)
      }

      // Insertar vehículo
      const { data: vehiculoInsertado, error: vehiculoError } = await supabase
        .from('vehiculos')
        .insert(vehiculoData)
        .select()
        .single()

      if (vehiculoError) {
        throw SupabaseErrorMapper.toDomainError(vehiculoError)
      }

      // Obtener el vehículo completo
      return await this.obtenerPorId(vehiculoInsertado.id, tallerId) as VehiculoEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene un vehículo por su ID
   * CRÍTICO: Incluye filtro de seguridad por tallerId
   */
  async obtenerPorId(id: string, tallerId: string): Promise<VehiculoEntity | null> {
    try {
      const supabase = await createClient()

      console.log('🔍 DEBUG obtenerPorId - Buscando vehículo:', { id, tallerId })

      // SIMPLIFICACIÓN: SELECT * para debugging
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('id', id)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('⚠️ Vehículo no encontrado:', id)
          return null // No encontrado
        }
        console.error('❌ ERROR REAL DE SUPABASE en obtenerPorId:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw SupabaseErrorMapper.toDomainError(error)
      }

      console.log('✅ Vehículo encontrado:', data)
      return VehiculoMapper.toDomain(data)

    } catch (error: any) {
      console.error('❌ ERROR EN CATCH de obtenerPorId:', {
        tipo: error.constructor.name,
        mensaje: error.message
      })
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene un vehículo por su matrícula
   */
  async obtenerPorMatricula(matricula: string, tallerId: string): Promise<VehiculoEntity | null> {
    try {
      const supabase = await createClient()

      // Normalizar matrícula (sin guiones, uppercase)
      const matriculaNormalizada = matricula.toUpperCase().replace(/-/g, '')

      console.log('🔍 DEBUG obtenerPorMatricula - Buscando:', { matricula, matriculaNormalizada, tallerId })

      // SIMPLIFICACIÓN: SELECT * y búsqueda simple
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .ilike('matricula', `%${matriculaNormalizada}%`) // Buscar simple
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('⚠️ Matrícula no encontrada:', matricula)
          return null
        }
        console.error('❌ ERROR REAL DE SUPABASE en obtenerPorMatricula:', {
          code: error.code,
          message: error.message,
          details: error.details
        })
        throw SupabaseErrorMapper.toDomainError(error)
      }

      console.log('✅ Vehículo encontrado por matrícula:', data)
      return VehiculoMapper.toDomain(data)

    } catch (error: any) {
      console.error('❌ ERROR EN CATCH de obtenerPorMatricula:', error.message)
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene un vehículo por su VIN
   * ⚠️ DESHABILITADO: El campo 'vin' NO EXISTE en la tabla vehiculos de Supabase
   * Solo hay: id, taller_id, cliente_id, matricula, marca, modelo, año, color
   */
  async obtenerPorVIN(vin: string, tallerId: string): Promise<VehiculoEntity | null> {
    console.warn('⚠️ obtenerPorVIN: El campo VIN no existe en la BD. Use obtenerPorMatricula()')
    return null // Método deshabilitado - campo no existe en BD
  }

  /**
   * Actualiza un vehículo existente
   */
  async actualizar(vehiculo: VehiculoEntity, tallerId: string): Promise<VehiculoEntity> {
    try {
      const supabase = await createClient()

      // Verificar que el vehículo existe y pertenece al taller
      const vehiculoExistente = await this.obtenerPorId(vehiculo.getId(), tallerId)
      if (!vehiculoExistente) {
        throw new NotFoundError('vehiculo', vehiculo.getId())
      }

      // Verificar que no exista otro vehículo con la misma matrícula (si cambió)
      if (vehiculo.getMatricula().valor !== vehiculoExistente.getMatricula().valor) {
        const existeMatricula = await this.existeMatricula(
          vehiculo.getMatricula().valor,
          tallerId,
          vehiculo.getId()
        )
        if (existeMatricula) {
          throw new ConflictError('Vehículo', 'matrícula', vehiculo.getMatricula().valor)
        }
      }

      // Convertir entity a formato de BD
      const vehiculoData = VehiculoMapper.toPersistence(vehiculo)

      // Actualizar vehículo
      const { error: vehiculoError } = await supabase
        .from('vehiculos')
        .update(vehiculoData)
        .eq('id', vehiculo.getId())
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      if (vehiculoError) {
        throw SupabaseErrorMapper.toDomainError(vehiculoError)
      }

      // Obtener el vehículo actualizado
      return await this.obtenerPorId(vehiculo.getId(), tallerId) as VehiculoEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Elimina un vehículo (soft delete)
   */
  async eliminar(id: string, tallerId: string): Promise<void> {
    try {
      const supabase = await createClient()

      // Verificar que el vehículo existe y pertenece al taller
      const vehiculo = await this.obtenerPorId(id, tallerId)
      if (!vehiculo) {
        throw new NotFoundError('vehiculo', id)
      }

      // Soft delete
      const { error } = await supabase
        .from('vehiculos')
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
   * Restaura un vehículo eliminado
   */
  async restaurar(id: string, tallerId: string): Promise<VehiculoEntity> {
    try {
      const supabase = await createClient()

      // Verificar que el vehículo existe
      const { data, error: fetchError } = await supabase
        .from('vehiculos')
        .select('id, taller_id, cliente_id, matricula, marca, modelo, año, color, created_at, updated_at, deleted_at')
        .eq('id', id)
        .eq('taller_id', tallerId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new NotFoundError('vehiculo', id)
        }
        throw SupabaseErrorMapper.toDomainError(fetchError)
      }

      // Restaurar
      const { error } = await supabase
        .from('vehiculos')
        .update({
          deleted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('taller_id', tallerId)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Retornar vehículo restaurado
      return await this.obtenerPorId(id, tallerId) as VehiculoEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Lista vehículos con filtros y paginación
   */
  async listar(
    filtros: VehiculoFiltros,
    paginacion: PaginacionOpciones,
    tallerId: string
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    try {
      const supabase = await createClient()

      console.log('🔍 DEBUG listarVehiculos - Iniciando query con:', {
        tallerId,
        filtros,
        paginacion
      })

      // SIMPLIFICACIÓN RADICAL: SELECT * para debugging
      let query = supabase
        .from('vehiculos')
        .select('*', { count: 'exact' })
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      // Ordenar según preferencia del usuario
      if (filtros.sortBy === 'antiguos') {
        query = query.order('created_at', { ascending: true })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      // Aplicar paginación
      const from = (paginacion.page - 1) * paginacion.pageSize
      const to = from + paginacion.pageSize - 1

      query = query.range(from, to)

      console.log('🔍 DEBUG listarVehiculos - Query construida, ejecutando...')

      // Ejecutar query
      const { data, error, count } = await query

      if (error) {
        // DEBUG DETALLADO DEL ERROR REAL DE SUPABASE
        console.error('❌ ERROR REAL DE SUPABASE en listarVehiculos:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          errorCompleto: JSON.stringify(error, null, 2)
        })
        throw SupabaseErrorMapper.toDomainError(error)
      }

      console.log('✅ DEBUG listarVehiculos - Query exitosa:', {
        registrosObtenidos: data?.length || 0,
        total: count
      })

      // Mapear resultados
      const vehiculos = (data || []).map(record => {
        console.log('🔍 Mapeando vehículo:', record)
        return VehiculoMapper.toDomain(record)
      })

      return {
        data: vehiculos,
        total: count || 0,
        page: paginacion.page,
        pageSize: paginacion.pageSize,
        totalPages: Math.ceil((count || 0) / paginacion.pageSize)
      }

    } catch (error: any) {
      // DEBUG DETALLADO DEL ERROR EN CATCH
      console.error('❌ ERROR EN CATCH de listarVehiculos:', {
        tipo: error.constructor.name,
        mensaje: error.message,
        stack: error.stack,
        errorCompleto: JSON.stringify(error, null, 2)
      })
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Busca vehículos por término de búsqueda
   */
  async buscar(
    termino: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    return this.listar(
      { busqueda: termino },
      paginacion,
      tallerId
    )
  }

  /**
   * Verifica si existe un vehículo con una matrícula específica
   */
  async existeMatricula(matricula: string, tallerId: string, excludeId?: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      // Normalizar matrícula
      const matriculaNormalizada = matricula.toUpperCase().replace(/-/g, '')

      let query = supabase
        .from('vehiculos')
        .select('id')
        .eq('taller_id', tallerId)
        .ilike('matricula', `%${matriculaNormalizada}%`)
        .is('deleted_at', null)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return (data || []).length > 0

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene vehículos de un cliente específico
   */
  async listarPorCliente(
    clienteId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    return this.listar(
      { clienteId },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene vehículos por marca
   */
  async listarPorMarca(
    marca: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    return this.listar(
      { marca },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene vehículos sin cliente asignado
   */
  async listarSinCliente(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    return this.listar(
      { soloSinCliente: true },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene vehículos activos (no eliminados)
   */
  async listarActivos(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    return this.listar(
      { incluirEliminados: false },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene vehículos eliminados
   */
  async listarEliminados(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    try {
      const supabase = await createClient()

      console.log('🔍 DEBUG listarEliminados - Buscando vehículos eliminados para taller:', tallerId)

      // SIMPLIFICACIÓN: SELECT *
      let query = supabase
        .from('vehiculos')
        .select('*', { count: 'exact' })
        .eq('taller_id', tallerId)
        // Nota: Si deleted_at NO existe en la tabla, esta query fallará
        // En ese caso, retornar array vacío

      // Aplicar paginación
      const from = (paginacion.page - 1) * paginacion.pageSize
      const to = from + paginacion.pageSize - 1

      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('❌ ERROR en listarEliminados (puede ser que deleted_at no exista):', {
          code: error.code,
          message: error.message
        })

        // Si la tabla no tiene deleted_at, retornar array vacío
        if (error.code === '42703') { // Column does not exist
          console.warn('⚠️ La tabla vehiculos NO tiene columna deleted_at, retornando array vacío')
          return {
            data: [],
            total: 0,
            page: paginacion.page,
            pageSize: paginacion.pageSize,
            totalPages: 0
          }
        }

        throw SupabaseErrorMapper.toDomainError(error)
      }

      const vehiculos = (data || []).map(record => VehiculoMapper.toDomain(record))

      console.log('✅ Vehículos eliminados encontrados:', vehiculos.length)

      return {
        data: vehiculos,
        total: count || 0,
        page: paginacion.page,
        pageSize: paginacion.pageSize,
        totalPages: Math.ceil((count || 0) / paginacion.pageSize)
      }

    } catch (error: any) {
      console.error('❌ ERROR EN CATCH de listarEliminados:', error.message)
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Cuenta vehículos por marca
   */
  async contarPorMarca(tallerId: string): Promise<Record<string, number>> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('vehiculos')
        .select('marca')
        .eq('taller_id', tallerId)
        .is('deleted_at', null)
        .not('marca', 'is', null)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Contar por marca
      const counts: Record<string, number> = {}

      data?.forEach(record => {
        const marca = record.marca || 'Sin marca'
        counts[marca] = (counts[marca] || 0) + 1
      })

      return counts

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Cuenta vehículos por tipo de combustible
   * NOTA: Campo 'tipo_combustible' no existe en esquema actual de Supabase
   */
  async contarPorTipoCombustible(tallerId: string): Promise<Record<TipoCombustible, number>> {
    try {
      console.warn('⚠️ contarPorTipoCombustible: Campo tipo_combustible no existe en BD')
      // Retornar objeto vacío porque el campo no existe en la BD actual
      return {} as Record<TipoCombustible, number>

      /* CÓDIGO ORIGINAL (deshabilitado porque tipo_combustible no existe):
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('vehiculos')
        .select('tipo_combustible')
        .eq('taller_id', tallerId)
        .is('deleted_at', null)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Contar por tipo
      const counts: Record<string, number> = {
        [TipoCombustible.GASOLINA]: 0,
        [TipoCombustible.DIESEL]: 0,
        [TipoCombustible.ELECTRICO]: 0,
        [TipoCombustible.HIBRIDO]: 0,
        [TipoCombustible.GAS]: 0,
        [TipoCombustible.OTRO]: 0
      } as Record<string, number>

      data?.forEach(record => {
        if (record.tipo_combustible) {
          counts[record.tipo_combustible] = (counts[record.tipo_combustible] || 0) + 1
        }
      })

      return counts as Record<TipoCombustible, number>
      */

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Cuenta vehículos totales, con cliente y sin cliente
   */
  async contarEstadisticas(tallerId: string): Promise<{
    total: number
    conCliente: number
    sinCliente: number
    conDatosCompletos: number
    eliminados: number
  }> {
    try {
      const supabase = await createClient()

      // Obtener todos los vehículos (incluyendo eliminados)
      // NOTA: Solo campos que EXISTEN en BD: id, taller_id, cliente_id, matricula, marca, modelo, año, color
      const { data, error } = await supabase
        .from('vehiculos')
        .select('cliente_id, marca, modelo, matricula, deleted_at')
        .eq('taller_id', tallerId)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      const vehiculos = data || []

      const stats = {
        total: 0,
        conCliente: 0,
        sinCliente: 0,
        conDatosCompletos: 0,
        eliminados: 0
      }

      vehiculos.forEach(v => {
        if (v.deleted_at) {
          stats.eliminados++
        } else {
          stats.total++
          if (v.cliente_id) {
            stats.conCliente++
          } else {
            stats.sinCliente++
          }
          // Datos completos = tiene marca, modelo y matrícula
          if (v.marca && v.modelo && v.matricula) {
            stats.conDatosCompletos++
          }
        }
      })

      return stats

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }
}
