import { IClienteRepository } from '@/application/ports'
import { ActualizarClienteDTO, ActualizarClienteSchema, ClienteResponseDTO } from '@/application/dtos'
import { NIF, Email, Telefono, IBAN } from '@/domain/value-objects'
import { ValidationError, NotFoundError } from '@/domain/errors'

export class ActualizarClienteUseCase {
  constructor(private readonly clienteRepository: IClienteRepository) {}

  async execute(id: string, dto: ActualizarClienteDTO, tallerId: string): Promise<ClienteResponseDTO> {
    const validacion = ActualizarClienteSchema.safeParse(dto)
    if (!validacion.success) {
      throw new ValidationError('Datos inválidos')
    }

    const cliente = await this.clienteRepository.obtenerPorId(id, tallerId)
    if (!cliente) throw new NotFoundError('cliente', id)

    const updates: any = {}
    if (dto.nombre) updates.nombre = dto.nombre
    if (dto.apellidos !== undefined) updates.apellidos = dto.apellidos
    if (dto.nif) updates.nif = NIF.create(dto.nif)
    if (dto.email !== undefined) updates.email = dto.email ? Email.create(dto.email) : undefined
    if (dto.telefono !== undefined) updates.telefono = dto.telefono ? Telefono.create(dto.telefono) : undefined
    if (dto.iban !== undefined) updates.iban = dto.iban ? IBAN.create(dto.iban) : undefined
    if (dto.direccion !== undefined) updates.direccion = dto.direccion
    if (dto.ciudad !== undefined) updates.ciudad = dto.ciudad
    if (dto.provincia !== undefined) updates.provincia = dto.provincia
    if (dto.codigoPostal !== undefined) updates.codigoPostal = dto.codigoPostal
    if (dto.pais) updates.pais = dto.pais
    if (dto.notas !== undefined) updates.notas = dto.notas
    if (dto.tipoCliente) updates.tipoCliente = dto.tipoCliente
    if (dto.requiereAutorizacion !== undefined) updates.requiereAutorizacion = dto.requiereAutorizacion
    if (dto.empresaRenting !== undefined) updates.empresaRenting = dto.empresaRenting
    if (dto.formaPago) updates.formaPago = dto.formaPago
    if (dto.diasPago !== undefined) updates.diasPago = dto.diasPago
    if (dto.limiteCredito !== undefined) updates.limiteCredito = dto.limiteCredito

    cliente.actualizar(updates)
    const clienteActualizado = await this.clienteRepository.actualizar(cliente, tallerId)
    return clienteActualizado.toDTO()
  }
}
