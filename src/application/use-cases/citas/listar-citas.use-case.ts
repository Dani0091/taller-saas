/**
 * @fileoverview Use Case: Listar Citas
 * @description Lista citas con filtros y paginación
 */

import { ICitaRepository, CitaFiltros, PaginacionOpciones } from '@/application/ports'
import { FiltrosCitaDTO, FiltrosCitaSchema, CitasPaginadasDTO, CitaListadoDTO } from '@/application/dtos/cita.dto'
import { ValidationError } from '@/domain/errors'

export class ListarCitasUseCase {
  constructor(private readonly citaRepository: ICitaRepository) {}

  async execute(
    dto: FiltrosCitaDTO,
    tallerId: string
  ): Promise<CitasPaginadasDTO> {
    // 1. Validar DTO
    const validacion = FiltrosCitaSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Filtros inválidos: ${errores.join(', ')}`)
    }

    const filtrosValidados = validacion.data

    // 2. Construir filtros del repositorio
    const filtros: CitaFiltros = {
      clienteId: filtrosValidados.clienteId,
      vehiculoId: filtrosValidados.vehiculoId,
      ordenId: filtrosValidados.ordenId,
      tipo: filtrosValidados.tipo,
      estado: filtrosValidados.estado,
      fechaDesde: filtrosValidados.fechaDesde ? new Date(filtrosValidados.fechaDesde) : undefined,
      fechaHasta: filtrosValidados.fechaHasta ? new Date(filtrosValidados.fechaHasta) : undefined,
      soloHoy: filtrosValidados.soloHoy,
      soloVencidas: filtrosValidados.soloVencidas,
      incluirEliminadas: filtrosValidados.incluirEliminadas
    }

    const paginacion: PaginacionOpciones = {
      page: filtrosValidados.page,
      pageSize: filtrosValidados.pageSize
    }

    // 3. Obtener citas
    const resultado = await this.citaRepository.listar(filtros, paginacion, tallerId)

    // 4. Mapear a DTOs de listado (versión resumida)
    const citasListado: CitaListadoDTO[] = resultado.data.map(cita => {
      const dto = cita.toDTO()
      return {
        id: dto.id,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        tipo: dto.tipo,
        fechaInicio: dto.fechaInicio,
        fechaFin: dto.fechaFin,
        todoElDia: dto.todoElDia,
        estado: dto.estado,
        color: dto.color,
        duracionMinutos: dto.duracionMinutos,
        isVencida: dto.isVencida,
        isHoy: dto.isHoy,
        tieneCliente: dto.tieneCliente,
        tieneVehiculo: dto.tieneVehiculo
      }
    })

    // 5. Retornar resultado paginado
    return {
      data: citasListado,
      total: resultado.total,
      page: resultado.page,
      pageSize: resultado.pageSize,
      totalPages: resultado.totalPages
    }
  }
}
