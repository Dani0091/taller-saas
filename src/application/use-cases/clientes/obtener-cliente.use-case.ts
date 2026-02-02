import { IClienteRepository } from '@/application/ports'
import { ClienteResponseDTO } from '@/application/dtos'
import { NotFoundError } from '@/domain/errors'

export class ObtenerClienteUseCase {
  constructor(private readonly clienteRepository: IClienteRepository) {}

  async execute(id: string, tallerId: string): Promise<ClienteResponseDTO> {
    const cliente = await this.clienteRepository.obtenerPorId(id, tallerId)
    if (!cliente) throw new NotFoundError('cliente', id)
    return cliente.toDTO()
  }
}
