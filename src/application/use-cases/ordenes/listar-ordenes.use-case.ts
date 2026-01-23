/**
 * @fileoverview Use Case: Listar Órdenes
 * @description Lista órdenes con filtros y paginación
 *
 * RESPONSABILIDAD ÚNICA: Orquestar el listado de órdenes
 * - Valida los filtros y paginación
 * - Llama al repositorio
 * - Mapea las entities a DTOs de respuesta
 * - Retorna resultado paginado
 */

import { IOrdenRepository } from '@/application/ports'
import {
  FiltrosOrdenDTO,
  FiltrosOrdenSchema,
  OrdenListItemDTO,
  OrdenPaginatedResponseDTO
} from '@/application/dtos'
import { ValidationError } from '@/domain/errors'

export class ListarOrdenesUseCase {
  constructor(private readonly ordenRepository: IOrdenRepository) {}

  async execute(
    filtrosDTO: FiltrosOrdenDTO,
    tallerId: string
  ): Promise<OrdenPaginatedResponseDTO> {
    // 1. Validar filtros y paginación
    const validacion = FiltrosOrdenSchema.safeParse(filtrosDTO)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Filtros inválidos: ${errores.join(', ')}`)
    }

    const filtrosValidados = validacion.data

    // 2. Convertir filtros del DTO al formato del repositorio
    const filtros = {
      estado: filtrosValidados.estado,
      clienteId: filtrosValidados.clienteId,
      vehiculoId: filtrosValidados.vehiculoId,
      operarioId: filtrosValidados.operarioId,
      fechaDesde: filtrosValidados.fechaDesde
        ? new Date(filtrosValidados.fechaDesde)
        : undefined,
      fechaHasta: filtrosValidados.fechaHasta
        ? new Date(filtrosValidados.fechaHasta)
        : undefined,
      busqueda: filtrosValidados.busqueda
    }

    const paginacion = {
      page: filtrosValidados.page,
      pageSize: filtrosValidados.pageSize
    }

    // 3. Obtener órdenes del repositorio
    const resultado = await this.ordenRepository.listar(filtros, paginacion, tallerId)

    // 4. Mapear entities a DTOs resumidos (para listados)
    const ordenesDTO: OrdenListItemDTO[] = resultado.data.map(orden => {
      const dto = orden.toDTO()

      return {
        id: dto.id,
        numeroOrden: dto.numeroOrden,
        clienteId: dto.clienteId,
        vehiculoId: dto.vehiculoId,
        estado: dto.estado,
        total: dto.total,
        totalFormateado: dto.totalFormateado,
        cantidadLineas: dto.lineas.length,
        isFacturada: dto.isFacturada,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt
      }
    })

    // 5. Retornar resultado paginado
    return {
      data: ordenesDTO,
      total: resultado.total,
      page: resultado.page,
      pageSize: resultado.pageSize,
      totalPages: resultado.totalPages
    }
  }
}
