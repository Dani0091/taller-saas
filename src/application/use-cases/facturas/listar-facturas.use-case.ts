/**
 * @fileoverview Use Case: Listar Facturas
 * @description Lista facturas con filtros y paginación
 *
 * RESPONSABILIDAD ÚNICA: Orquestar el listado de facturas
 * - Valida filtros y paginación
 * - Aplica filtros (estado, cliente, fechas, etc.)
 * - Retorna resultados paginados
 */

import { IFacturaRepository } from '@/application/ports'
import { FiltrosFacturaDTO, FiltrosFacturaSchema, FacturasPaginadasDTO } from '@/application/dtos'
import { ValidationError } from '@/domain/errors'

export class ListarFacturasUseCase {
  constructor(private readonly facturaRepository: IFacturaRepository) {}

  async execute(
    filtrosDTO: FiltrosFacturaDTO,
    tallerId: string
  ): Promise<FacturasPaginadasDTO> {
    // 1. Validar filtros
    const validacion = FiltrosFacturaSchema.safeParse(filtrosDTO)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Filtros inválidos: ${errores.join(', ')}`)
    }

    const filtrosValidados = validacion.data

    // 2. Preparar filtros
    const filtros = {
      estado: filtrosValidados.estado,
      tipo: filtrosValidados.tipo,
      clienteId: filtrosValidados.clienteId,
      ordenId: filtrosValidados.ordenId,
      estadoVerifactu: filtrosValidados.estadoVerifactu,
      fechaDesde: filtrosValidados.fechaDesde
        ? new Date(filtrosValidados.fechaDesde)
        : undefined,
      fechaHasta: filtrosValidados.fechaHasta
        ? new Date(filtrosValidados.fechaHasta)
        : undefined,
      vencidas: filtrosValidados.vencidas,
      busqueda: filtrosValidados.busqueda
    }

    const paginacion = {
      page: filtrosValidados.page,
      pageSize: filtrosValidados.pageSize
    }

    // 3. Obtener facturas del repositorio
    const resultado = await this.facturaRepository.listar(filtros, paginacion, tallerId)

    // 4. Convertir a DTOs simplificados para listado
    const facturasDTO = resultado.data.map(factura => {
      const dto = factura.toDTO()
      return {
        id: dto.id,
        numeroFactura: dto.numeroFactura,
        tipo: dto.tipo,
        estado: dto.estado,
        clienteId: dto.clienteId,
        clienteNIF: dto.clienteNIF,
        fechaEmision: dto.fechaEmision,
        fechaVencimiento: dto.fechaVencimiento,
        total: dto.total,
        totalFormateado: dto.totalFormateado,
        isVencida: dto.isVencida,
        estadoVerifactu: dto.estadoVerifactu
      }
    })

    // 5. Retornar resultado paginado
    return {
      data: facturasDTO,
      total: resultado.total,
      page: resultado.page,
      pageSize: resultado.pageSize,
      totalPages: resultado.totalPages
    }
  }
}
