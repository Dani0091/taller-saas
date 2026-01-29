/**
 * @fileoverview Repository: Supabase Factura Repository
 * @description Implementación concreta del repositorio de facturas usando Supabase
 *
 * PRINCIPIOS:
 * - Multi-tenancy: TODAS las consultas filtran por taller_id
 * - Inmutabilidad: Facturas emitidas NO se modifican (respetado por triggers)
 * - Error handling: Usa SupabaseErrorMapper
 * - Mapeo: Usa FacturaMapper para conversiones
 * - Seguridad: Respeta RLS de Supabase
 *
 * VENTAJA: Si mañana cambias a PostgreSQL directo, solo cambias ESTE archivo
 */

import { createClient } from '@/lib/supabase/server'
import { FacturaEntity, LineaFacturaEntity } from '@/domain/entities'
import { EstadoFactura, EstadoVerifactu } from '@/domain/types'
import { NotFoundError, BusinessRuleError } from '@/domain/errors'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { FacturaMapper } from './factura.mapper'
import type {
  IFacturaRepository,
  FacturaFiltros,
  PaginacionOpciones,
  ResultadoPaginado
} from '@/application/ports'

export class SupabaseFacturaRepository implements IFacturaRepository {
  /**
   * Crea una nueva factura (borrador) en la base de datos
   */
  async crear(factura: FacturaEntity, tallerId: string): Promise<FacturaEntity> {
    try {
      const supabase = await createClient()

      // Convertir entity a formato de BD
      const facturaData = FacturaMapper.toPersistence(factura)

      // Validar seguridad: la factura debe pertenecer al taller
      if (facturaData.taller_id !== tallerId) {
        throw new Error('Violación de seguridad: taller_id no coincide')
      }

      // Insertar factura principal
      const { data: facturaInsertada, error: facturaError } = await supabase
        .from('facturas')
        .insert(facturaData)
        .select()
        .single()

      if (facturaError) {
        throw SupabaseErrorMapper.toDomainError(facturaError)
      }

      // Insertar líneas si existen
      const lineas = factura.getLineas()
      if (lineas.length > 0) {
        const lineasData = lineas.map(linea => FacturaMapper.lineaToPersistence(linea))

        const { error: lineasError } = await supabase
          .from('detalles_factura')
          .insert(lineasData)

        if (lineasError) {
          // Si falla, intentar eliminar la factura (rollback manual)
          await supabase
            .from('facturas')
            .delete()
            .eq('id', facturaInsertada.id)

          throw SupabaseErrorMapper.toDomainError(lineasError)
        }
      }

      // Obtener la factura completa con líneas
      return await this.obtenerPorId(facturaInsertada.id, tallerId) as FacturaEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene una factura por su ID
   * CRÍTICO: Incluye filtro de seguridad por tallerId
   */
  async obtenerPorId(id: string, tallerId: string): Promise<FacturaEntity | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('facturas')
        .select(`
          *,
          lineas:detalles_factura(*)
        `)
        .eq('id', id)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return FacturaMapper.toDomain(data)

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene una factura por su número
   */
  async obtenerPorNumero(numeroFactura: string, tallerId: string): Promise<FacturaEntity | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('facturas')
        .select(`
          *,
          lineas:lineas_factura(*)
        `)
        .eq('numero_factura', numeroFactura)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return FacturaMapper.toDomain(data)

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Actualiza una factura existente
   * CRÍTICO: Solo permite actualización de borradores (validado por RLS trigger)
   */
  async actualizar(factura: FacturaEntity, tallerId: string): Promise<FacturaEntity> {
    try {
      const supabase = await createClient()

      // Verificar que la factura existe y pertenece al taller
      const facturaExistente = await this.obtenerPorId(factura.getId(), tallerId)
      if (!facturaExistente) {
        throw new NotFoundError('factura', factura.getId())
      }

      // Verificar que se puede modificar (Entity ya valida esto, pero double-check)
      if (!factura.puedeModificarse()) {
        throw new BusinessRuleError('Solo se pueden modificar facturas en borrador')
      }

      // Convertir entity a formato de BD
      const facturaData = FacturaMapper.toPersistence(factura)

      // Actualizar factura principal
      const { error: facturaError } = await supabase
        .from('facturas')
        .update(facturaData)
        .eq('id', factura.getId())
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      if (facturaError) {
        throw SupabaseErrorMapper.toDomainError(facturaError)
      }

      // Actualizar líneas (estrategia: eliminar todas y reinsertar)
      // Primero eliminar líneas existentes
      await supabase
        .from('lineas_factura')
        .delete()
        .eq('factura_id', factura.getId())

      // Insertar líneas nuevas
      const lineas = factura.getLineas()
      if (lineas.length > 0) {
        const lineasData = lineas.map(linea => FacturaMapper.lineaToPersistence(linea))

        const { error: lineasError } = await supabase
          .from('detalles_factura')
          .insert(lineasData)

        if (lineasError) {
          throw SupabaseErrorMapper.toDomainError(lineasError)
        }
      }

      // Obtener la factura actualizada
      return await this.obtenerPorId(factura.getId(), tallerId) as FacturaEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Emite una factura (cambia estado a EMITIDA)
   * IMPORTANTE: Incluye asignación de número de factura mediante RPC
   */
  async emitir(factura: FacturaEntity, userId: string, tallerId: string): Promise<FacturaEntity> {
    try {
      const supabase = await createClient()

      // Verificar que la factura existe y pertenece al taller
      const facturaExistente = await this.obtenerPorId(factura.getId(), tallerId)
      if (!facturaExistente) {
        throw new NotFoundError('factura', factura.getId())
      }

      // Verificar que se puede emitir (Entity ya valida esto)
      if (!factura.puedeEmitirse()) {
        throw new BusinessRuleError('La factura no puede ser emitida')
      }

      // Asignar número de factura mediante RPC si no tiene
      if (!factura.getNumeroFactura()) {
        const numeroFactura = factura.getNumeroFactura()
        const serie = numeroFactura ? numeroFactura.getSerie().valor : 'F'
        const año = new Date().getFullYear()

        const { numeroCompleto } = await this.asignarNumeroFactura(
          factura.getId(),
          serie,
          año,
          tallerId
        )

        // Actualizar el número en la factura (en memoria)
        // La BD ya lo tiene, pero actualizamos la entity para coherencia
      }

      // Emitir la factura (Entity maneja la lógica)
      factura.emitir(userId)

      // Persistir cambios
      const facturaData = FacturaMapper.toPersistence(factura)

      const { error } = await supabase
        .from('facturas')
        .update({
          estado: facturaData.estado,
          emitida_by: facturaData.emitida_by,
          updated_at: facturaData.updated_at
        })
        .eq('id', factura.getId())
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Obtener la factura actualizada
      return await this.obtenerPorId(factura.getId(), tallerId) as FacturaEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Anula una factura (cambia estado a ANULADA)
   * NOTA: Requiere motivo de anulación
   */
  async anular(id: string, motivo: string, userId: string, tallerId: string): Promise<FacturaEntity> {
    try {
      const supabase = await createClient()

      // Obtener la factura
      const factura = await this.obtenerPorId(id, tallerId)
      if (!factura) {
        throw new NotFoundError('factura', id)
      }

      // Anular la factura (Entity maneja la lógica y validaciones)
      factura.anular(motivo, userId)

      // Persistir cambios
      const { error } = await supabase
        .from('facturas')
        .update({
          estado: 'anulada',
          motivo_anulacion: motivo,
          anulada_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Obtener la factura actualizada
      return await this.obtenerPorId(id, tallerId) as FacturaEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Marca una factura como pagada
   */
  async marcarPagada(id: string, userId: string, tallerId: string): Promise<FacturaEntity> {
    try {
      const supabase = await createClient()

      // Obtener la factura
      const factura = await this.obtenerPorId(id, tallerId)
      if (!factura) {
        throw new NotFoundError('factura', id)
      }

      // Marcar como pagada (Entity maneja la lógica y validaciones)
      factura.marcarPagada(userId)

      // Persistir cambios
      const { error } = await supabase
        .from('facturas')
        .update({
          estado: 'pagada',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Obtener la factura actualizada
      return await this.obtenerPorId(id, tallerId) as FacturaEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Lista facturas con filtros y paginación
   */
  async listar(
    filtros: FacturaFiltros,
    paginacion: PaginacionOpciones,
    tallerId: string
  ): Promise<ResultadoPaginado<FacturaEntity>> {
    try {
      const supabase = await createClient()

      // Construir query base
      let query = supabase
        .from('facturas')
        .select('*, lineas:lineas_factura(*)', { count: 'exact' })
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      // Aplicar filtros
      if (filtros.estado) {
        query = query.eq('estado', filtros.estado)
      }

      if (filtros.tipo) {
        query = query.eq('tipo', filtros.tipo)
      }

      if (filtros.clienteId) {
        query = query.eq('cliente_id', filtros.clienteId)
      }

      if (filtros.ordenId) {
        query = query.eq('orden_id', filtros.ordenId)
      }

      if (filtros.estadoVerifactu) {
        query = query.eq('estado_verifactu', filtros.estadoVerifactu)
      }

      if (filtros.fechaDesde) {
        query = query.gte('fecha_emision', filtros.fechaDesde.toISOString())
      }

      if (filtros.fechaHasta) {
        query = query.lte('fecha_emision', filtros.fechaHasta.toISOString())
      }

      if (filtros.vencidas) {
        query = query.eq('estado', 'emitida')
        query = query.lt('fecha_vencimiento', new Date().toISOString())
      }

      if (filtros.busqueda) {
        query = query.or(`numero_factura.ilike.%${filtros.busqueda}%,cliente_nif.ilike.%${filtros.busqueda}%`)
      }

      // Ordenar por fecha de emisión (más recientes primero)
      query = query.order('fecha_emision', { ascending: false })

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
      const facturas = (data || []).map(record => FacturaMapper.toDomain(record))

      return {
        data: facturas,
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
   * Cuenta facturas por estado
   */
  async contarPorEstado(tallerId: string): Promise<Record<EstadoFactura, number>> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('facturas')
        .select('estado')
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Contar por estado
      const counts: Record<string, number> = {}
      Object.values(EstadoFactura).forEach(estado => {
        counts[estado] = 0
      })

      data?.forEach(record => {
        counts[record.estado] = (counts[record.estado] || 0) + 1
      })

      return counts as Record<EstadoFactura, number>

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene el último número de factura generado para una serie y año
   */
  async obtenerUltimoNumeroFactura(serie: string, año: number, tallerId: string): Promise<string | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('series_facturacion')
        .select('ultimo_numero, serie')
        .eq('taller_id', tallerId)
        .eq('serie', serie)
        .eq('año', año)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No hay serie creada aún
        }
        throw SupabaseErrorMapper.toDomainError(error)
      }

      if (!data || data.ultimo_numero === 0) {
        return null
      }

      // Formatear número completo
      const numeroFormateado = data.ultimo_numero.toString().padStart(6, '0')
      return `${serie}-${año}-${numeroFormateado}`

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Verifica si existe una factura con un número específico
   */
  async existeNumeroFactura(numeroFactura: string, tallerId: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('facturas')
        .select('id')
        .eq('numero_factura', numeroFactura)
        .eq('taller_id', tallerId)
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
   * Obtiene todas las facturas de un cliente
   */
  async listarPorCliente(
    clienteId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<FacturaEntity>> {
    return this.listar(
      { clienteId },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene todas las facturas de una orden
   */
  async listarPorOrden(ordenId: string, tallerId: string): Promise<FacturaEntity[]> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('facturas')
        .select('*, lineas:lineas_factura(*)')
        .eq('orden_id', ordenId)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .order('fecha_emision', { ascending: false })

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return (data || []).map(record => FacturaMapper.toDomain(record))

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene facturas vencidas
   */
  async listarVencidas(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<FacturaEntity>> {
    return this.listar(
      { vencidas: true },
      paginacion,
      tallerId
    )
  }

  /**
   * Asigna número de factura usando RPC atómico
   * CRÍTICO: Usa FOR UPDATE para prevenir race conditions
   */
  async asignarNumeroFactura(
    facturaId: string,
    serie: string,
    año: number,
    tallerId: string
  ): Promise<{ numeroCompleto: string; numero: number }> {
    try {
      const supabase = await createClient()

      // Llamar al RPC que maneja la numeración atómica
      const { data, error } = await supabase.rpc('asignar_numero_factura', {
        p_taller_id: tallerId,
        p_serie: serie,
        p_año: año
      })

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Actualizar la factura con el número asignado
      const { error: updateError } = await supabase
        .from('facturas')
        .update({
          numero_factura: data.numero_completo,
          numero_serie: serie,
          updated_at: new Date().toISOString()
        })
        .eq('id', facturaId)
        .eq('taller_id', tallerId)

      if (updateError) {
        throw SupabaseErrorMapper.toDomainError(updateError)
      }

      return {
        numeroCompleto: data.numero_completo,
        numero: data.numero
      }

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Actualiza estado de Verifactu
   */
  async actualizarVerifactu(
    facturaId: string,
    numeroVerifactu: string,
    urlVerifactu: string,
    estadoVerifactu: EstadoVerifactu,
    tallerId: string
  ): Promise<void> {
    try {
      const supabase = await createClient()

      const { error } = await supabase
        .from('facturas')
        .update({
          numero_verifactu: numeroVerifactu,
          verifactu_url: urlVerifactu,
          estado_verifactu: estadoVerifactu,
          updated_at: new Date().toISOString()
        })
        .eq('id', facturaId)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }
}
