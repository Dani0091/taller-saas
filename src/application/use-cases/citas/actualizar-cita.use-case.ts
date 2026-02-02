/**
 * @fileoverview Use Case: Actualizar Cita
 * @description Actualiza una cita existente
 */

import { ICitaRepository } from '@/application/ports'
import { ActualizarCitaDTO, ActualizarCitaSchema, CitaResponseDTO } from '@/application/dtos/cita.dto'
import { ValidationError, NotFoundError } from '@/domain/errors'

export class ActualizarCitaUseCase {
  constructor(private readonly citaRepository: ICitaRepository) {}

  async execute(
    id: string,
    dto: ActualizarCitaDTO,
    tallerId: string
  ): Promise<CitaResponseDTO> {
    // 1. Validar DTO
    const validacion = ActualizarCitaSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Datos inválidos: ${errores.join(', ')}`)
    }

    const datosValidados = validacion.data

    // 2. Obtener cita existente
    const cita = await this.citaRepository.obtenerPorId(id, tallerId)
    if (!cita) {
      throw new NotFoundError('cita', id)
    }

    // 3. Preparar datos actualizados
    const datosActualizados: any = {}

    if (datosValidados.titulo !== undefined) datosActualizados.titulo = datosValidados.titulo
    if (datosValidados.descripcion !== undefined) datosActualizados.descripcion = datosValidados.descripcion
    if (datosValidados.tipo !== undefined) datosActualizados.tipo = datosValidados.tipo
    if (datosValidados.fechaInicio !== undefined) datosActualizados.fechaInicio = new Date(datosValidados.fechaInicio)
    if (datosValidados.fechaFin !== undefined) {
      datosActualizados.fechaFin = datosValidados.fechaFin ? new Date(datosValidados.fechaFin) : undefined
    }
    if (datosValidados.todoElDia !== undefined) datosActualizados.todoElDia = datosValidados.todoElDia
    if (datosValidados.clienteId !== undefined) datosActualizados.clienteId = datosValidados.clienteId || undefined
    if (datosValidados.vehiculoId !== undefined) datosActualizados.vehiculoId = datosValidados.vehiculoId || undefined
    if (datosValidados.ordenId !== undefined) datosActualizados.ordenId = datosValidados.ordenId || undefined
    if (datosValidados.notificarCliente !== undefined) datosActualizados.notificarCliente = datosValidados.notificarCliente
    if (datosValidados.color !== undefined) datosActualizados.color = datosValidados.color

    // 4. Actualizar entity
    cita.actualizar(datosActualizados)

    // 5. Persistir
    const citaActualizada = await this.citaRepository.actualizar(cita, tallerId)

    // 6. Retornar DTO
    return citaActualizada.toDTO()
  }
}
