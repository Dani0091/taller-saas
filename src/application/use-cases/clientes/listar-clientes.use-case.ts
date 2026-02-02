import { IClienteRepository } from '@/application/ports'
import { FiltrosClienteDTO, FiltrosClienteSchema, ClientesPaginadosDTO } from '@/application/dtos'
import { ValidationError } from '@/domain/errors'

export class ListarClientesUseCase {
  constructor(private readonly clienteRepository: IClienteRepository) {}

  async execute(filtrosDTO: FiltrosClienteDTO, tallerId: string): Promise<ClientesPaginadosDTO> {
    const validacion = FiltrosClienteSchema.safeParse(filtrosDTO)
    if (!validacion.success) {
      throw new ValidationError('Filtros inválidos')
    }

    const filtrosValidados = validacion.data
    const filtros = {
      estado: filtrosValidados.estado,
      tipoCliente: filtrosValidados.tipoCliente,
      busqueda: filtrosValidados.busqueda,
      ciudad: filtrosValidados.ciudad,
      provincia: filtrosValidados.provincia,
      incluirEliminados: filtrosValidados.incluirEliminados
    }

    const paginacion = {
      page: filtrosValidados.page,
      pageSize: filtrosValidados.pageSize
    }

    const resultado = await this.clienteRepository.listar(filtros, paginacion, tallerId)

    const clientesDTO = resultado.data.map(cliente => {
      const dto = cliente.toDTO()
      return {
        id: dto.id,
        nombre: dto.nombre,
        nombreCompleto: dto.nombreCompleto,
        nif: dto.nif,
        nifMasked: dto.nifMasked,
        email: dto.email,
        telefono: dto.telefono,
        direccion: dto.direccion,
        ciudad: dto.ciudad,
        tipoCliente: dto.tipoCliente,
        estado: dto.estado,
        isActivo: dto.isActivo,
        created_at: dto.createdAt
      }
    })

    return {
      data: clientesDTO,
      total: resultado.total,
      page: resultado.page,
      pageSize: resultado.pageSize,
      totalPages: resultado.totalPages
    }
  }
}
