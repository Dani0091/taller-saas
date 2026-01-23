import { IClienteRepository } from '@/application/ports'

export class EliminarClienteUseCase {
  constructor(private readonly clienteRepository: IClienteRepository) {}

  async execute(id: string, tallerId: string, userId: string): Promise<void> {
    await this.clienteRepository.eliminar(id, tallerId, userId)
  }
}
