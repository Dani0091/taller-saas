/**
 * @fileoverview Use Case: Listar Vehículos
 * @description Lista vehículos con filtros y paginación
 */

import { IVehiculoRepository, VehiculoFiltros, PaginacionOpciones } from '@/application/ports'
import { FiltrosVehiculoDTO, FiltrosVehiculoSchema, VehiculosPaginadosDTO, VehiculoListadoDTO } from '@/application/dtos/vehiculo.dto'
import { ValidationError } from '@/domain/errors'

export class ListarVehiculosUseCase {
  constructor(private readonly vehiculoRepository: IVehiculoRepository) {}

  async execute(
    dto: FiltrosVehiculoDTO,
    tallerId: string
  ): Promise<VehiculosPaginadosDTO> {
    // 1. Validar DTO
    const validacion = FiltrosVehiculoSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Filtros inválidos: ${errores.join(', ')}`)
    }

    const filtrosValidados = validacion.data

    // 2. Construir filtros del repositorio
    const filtros: VehiculoFiltros = {
      clienteId: filtrosValidados.clienteId,
      marca: filtrosValidados.marca,
      modelo: filtrosValidados.modelo,
      año: filtrosValidados.año,
      tipoCombustible: filtrosValidados.tipoCombustible,
      busqueda: filtrosValidados.busqueda,
      incluirEliminados: filtrosValidados.incluirEliminados,
      soloSinCliente: filtrosValidados.soloSinCliente,
      soloConDatosCompletos: filtrosValidados.soloConDatosCompletos
    }

    const paginacion: PaginacionOpciones = {
      page: filtrosValidados.page,
      pageSize: filtrosValidados.pageSize
    }

    // 3. Obtener vehículos
    const resultado = await this.vehiculoRepository.listar(filtros, paginacion, tallerId)

    // 4. Mapear a DTOs de listado (versión resumida)
    const vehiculosListado: VehiculoListadoDTO[] = resultado.data.map(vehiculo => {
      const dto = vehiculo.toDTO()
      return {
        id: dto.id,
        matricula: dto.matricula,
        matriculaFormateada: dto.matriculaFormateada,
        marca: dto.marca,
        modelo: dto.modelo,
        año: dto.año,
        color: dto.color,
        kilometros: dto.kilometros,
        vin: dto.vin,
        tipoCombustible: dto.tipoCombustible,
        descripcionCompleta: dto.descripcionCompleta,
        tieneCliente: dto.tieneCliente,
        tieneDatosCompletos: dto.tieneDatosCompletos
      }
    })

    // 5. Retornar resultado paginado
    return {
      data: vehiculosListado,
      total: resultado.total,
      page: resultado.page,
      pageSize: resultado.pageSize,
      totalPages: resultado.totalPages
    }
  }
}
