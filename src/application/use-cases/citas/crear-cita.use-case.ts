/**
 * @fileoverview Use Case: Crear Cita
 * @description Crea una nueva cita en el calendario del taller
 */

import { ICitaRepository } from '@/application/ports'
import { CrearCitaDTO, CrearCitaSchema, CitaResponseDTO } from '@/application/dtos/cita.dto'
import { CitaEntity } from '@/domain/entities'
import { ValidationError } from '@/domain/errors'

export class CrearCitaUseCase {
  constructor(private readonly citaRepository: ICitaRepository) {}

  async execute(
    dto: CrearCitaDTO,
    tallerId: string,
    userId?: string
  ): Promise<CitaResponseDTO> {
    // 1. Validar DTO
    const validacion = CrearCitaSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Datos inválidos: ${errores.join(', ')}`)
    }

    const datosValidados = validacion.data

    // 2. Crear entity
    const cita = CitaEntity.create({
      id: crypto.randomUUID(),
      tallerId,
      titulo: datosValidados.titulo,
      descripcion: datosValidados.descripcion,
      tipo: datosValidados.tipo,
      fechaInicio: new Date(datosValidados.fechaInicio),
      fechaFin: datosValidados.fechaFin ? new Date(datosValidados.fechaFin) : undefined,
      todoElDia: datosValidados.todoElDia,
      clienteId: datosValidados.clienteId,
      vehiculoId: datosValidados.vehiculoId,
      ordenId: datosValidados.ordenId,
      estado: 'pendiente' as any,
      notificarCliente: datosValidados.notificarCliente,
      recordatorioEnviado: false,
      color: datosValidados.color,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    })

    // 3. Persistir
    const citaCreada = await this.citaRepository.crear(cita, tallerId)

    // 4. Retornar DTO
    return citaCreada.toDTO()
  }
}
