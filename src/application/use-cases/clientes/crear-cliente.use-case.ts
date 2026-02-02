/**
 * @fileoverview Use Case: Crear Cliente
 * @description Crea un nuevo cliente en el taller
 */

import { IClienteRepository } from '@/application/ports'
import { CrearClienteDTO, CrearClienteSchema, ClienteResponseDTO } from '@/application/dtos'
import { ClienteEntity } from '@/domain/entities'
import { NIF, Email, Telefono, IBAN } from '@/domain/value-objects'
import { EstadoCliente } from '@/domain/types'
import { ValidationError } from '@/domain/errors'

export class CrearClienteUseCase {
  constructor(private readonly clienteRepository: IClienteRepository) {}

  async execute(
    dto: CrearClienteDTO,
    tallerId: string
  ): Promise<ClienteResponseDTO> {
    // 1. Validar DTO
    const validacion = CrearClienteSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Datos inválidos: ${errores.join(', ')}`)
    }

    const datosValidados = validacion.data

    // 2. Crear Value Objects
    const nif = NIF.create(datosValidados.nif)
    const email = datosValidados.email ? Email.create(datosValidados.email) : undefined
    const telefono = datosValidados.telefono ? Telefono.create(datosValidados.telefono) : undefined
    const iban = datosValidados.iban ? IBAN.create(datosValidados.iban) : undefined

    // 3. Crear entity
    const cliente = ClienteEntity.create({
      id: crypto.randomUUID(),
      tallerId,
      nombre: datosValidados.nombre,
      apellidos: datosValidados.apellidos,
      nif,
      email,
      telefono,
      direccion: datosValidados.direccion,
      ciudad: datosValidados.ciudad,
      provincia: datosValidados.provincia,
      codigoPostal: datosValidados.codigoPostal,
      pais: datosValidados.pais,
      notas: datosValidados.notas,
      estado: EstadoCliente.ACTIVO,
      tipoCliente: datosValidados.tipoCliente,
      requiereAutorizacion: datosValidados.requiereAutorizacion,
      empresaRenting: datosValidados.empresaRenting,
      iban,
      formaPago: datosValidados.formaPago,
      diasPago: datosValidados.diasPago,
      limiteCredito: datosValidados.limiteCredito,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // 4. Persistir
    const clienteCreado = await this.clienteRepository.crear(cliente, tallerId)

    // 5. Retornar DTO
    return clienteCreado.toDTO()
  }
}
