/**
 * @fileoverview Port: Repositorio de Facturas
 * @description Interface que define el contrato del repositorio de facturas
 *
 * PRINCIPIO DE INVERSIÓN DE DEPENDENCIAS:
 * Los casos de uso dependen de esta interface, NO de la implementación concreta.
 * Esto permite cambiar fácilmente de Supabase a otra BD sin afectar la lógica.
 *
 * VENTAJA: Si mañana cambias Supabase por PostgreSQL directo, solo cambias
 * la implementación, NO los casos de uso ni el dominio.
 */

import type { PaginacionOpciones, ResultadoPaginado } from './repository.types'

import { FacturaEntity } from '@/domain/entities'
import { EstadoFactura, TipoFactura, EstadoVerifactu } from '@/domain/types'

/**
 * Filtros para búsqueda de facturas
 */
export interface FacturaFiltros {
  estado?: EstadoFactura
  tipo?: TipoFactura
  clienteId?: string
  ordenId?: string
  estadoVerifactu?: EstadoVerifactu
  fechaDesde?: Date
  fechaHasta?: Date
  vencidas?: boolean // Solo facturas vencidas
  busqueda?: string // Búsqueda por número o cliente
}

/**
 * Interface del repositorio de facturas
 *
 * IMPORTANTE: Todos los métodos deben incluir el tallerId para multi-tenancy
 */
export interface IFacturaRepository {
  /**
   * Crea una nueva factura (borrador)
   */
  crear(factura: FacturaEntity, tallerId: string): Promise<FacturaEntity>

  /**
   * Obtiene una factura por su ID
   * IMPORTANTE: Incluye filtro de seguridad por tallerId
   */
  obtenerPorId(id: string, tallerId: string): Promise<FacturaEntity | null>

  /**
   * Obtiene una factura por su número
   */
  obtenerPorNumero(numeroFactura: string, tallerId: string): Promise<FacturaEntity | null>

  /**
   * Actualiza una factura existente
   * CRÍTICO: Solo permite actualización de borradores (validado por Entity)
   */
  actualizar(factura: FacturaEntity, tallerId: string): Promise<FacturaEntity>

  /**
   * Emite una factura (cambia estado a EMITIDA)
   * IMPORTANTE: Incluye asignación de número de factura mediante RPC
   */
  emitir(factura: FacturaEntity, userId: string, tallerId: string): Promise<FacturaEntity>

  /**
   * Anula una factura (cambia estado a ANULADA)
   * NOTA: Requiere motivo de anulación
   */
  anular(id: string, motivo: string, userId: string, tallerId: string): Promise<FacturaEntity>

  /**
   * Marca una factura como pagada
   */
  marcarPagada(id: string, userId: string, tallerId: string): Promise<FacturaEntity>

  /**
   * Lista facturas con filtros y paginación
   */
  listar(
    filtros: FacturaFiltros,
    paginacion: PaginacionOpciones,
    tallerId: string
  ): Promise<ResultadoPaginado<FacturaEntity>>

  /**
   * Cuenta facturas por estado
   */
  contarPorEstado(tallerId: string): Promise<Record<EstadoFactura, number>>

  /**
   * Obtiene el último número de factura generado para una serie y año
   * Útil para preview antes de emitir
   */
  obtenerUltimoNumeroFactura(serie: string, año: number, tallerId: string): Promise<string | null>

  /**
   * Verifica si existe una factura con un número específico
   */
  existeNumeroFactura(numeroFactura: string, tallerId: string): Promise<boolean>

  /**
   * Obtiene todas las facturas de un cliente
   */
  listarPorCliente(
    clienteId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<FacturaEntity>>

  /**
   * Obtiene todas las facturas de una orden
   */
  listarPorOrden(
    ordenId: string,
    tallerId: string
  ): Promise<FacturaEntity[]>

  /**
   * Obtiene facturas vencidas
   */
  listarVencidas(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<FacturaEntity>>

  /**
   * Asigna número de factura usando RPC atómico
   * CRÍTICO: Usa FOR UPDATE para prevenir race conditions
   */
  asignarNumeroFactura(
    facturaId: string,
    serie: string,
    año: number,
    tallerId: string
  ): Promise<{ numeroCompleto: string; numero: number }>

  /**
   * Actualiza estado de Verifactu
   */
  actualizarVerifactu(
    facturaId: string,
    numeroVerifactu: string,
    urlVerifactu: string,
    estadoVerifactu: EstadoVerifactu,
    tallerId: string
  ): Promise<void>
}
