/**
 * @fileoverview Use Case: Actualizar Vehículo
 * @description Actualiza un vehículo existente
 */

import { IVehiculoRepository } from '@/application/ports'
import { ActualizarVehiculoDTO, ActualizarVehiculoSchema, VehiculoResponseDTO } from '@/application/dtos/vehiculo.dto'
import { Matricula, VIN, Kilometraje } from '@/domain/value-objects'
import { ValidationError, NotFoundError } from '@/domain/errors'

export class ActualizarVehiculoUseCase {
  constructor(private readonly vehiculoRepository: IVehiculoRepository) {}

  async execute(
    id: string,
    dto: ActualizarVehiculoDTO,
    tallerId: string
  ): Promise<VehiculoResponseDTO> {
    // 1. Validar DTO
    const validacion = ActualizarVehiculoSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Datos inválidos: ${errores.join(', ')}`)
    }

    const datosValidados = validacion.data

    // 2. Obtener vehículo existente
    const vehiculo = await this.vehiculoRepository.obtenerPorId(id, tallerId)
    if (!vehiculo) {
      throw new NotFoundError('vehiculo', id)
    }

    // 3. Preparar datos actualizados
    const datosActualizados: any = {}

    if (datosValidados.clienteId !== undefined) {
      datosActualizados.clienteId = datosValidados.clienteId || undefined
    }

    if (datosValidados.matricula) {
      datosActualizados.matricula = Matricula.create(datosValidados.matricula)
    }

    if (datosValidados.marca !== undefined) datosActualizados.marca = datosValidados.marca
    if (datosValidados.modelo !== undefined) datosActualizados.modelo = datosValidados.modelo
    if (datosValidados.año !== undefined) datosActualizados.año = datosValidados.año
    if (datosValidados.color !== undefined) datosActualizados.color = datosValidados.color

    if (datosValidados.kilometros !== undefined) {
      datosActualizados.kilometros = Kilometraje.create(datosValidados.kilometros)
    }

    if (datosValidados.vin !== undefined) {
      datosActualizados.vin = datosValidados.vin ? VIN.create(datosValidados.vin) : undefined
    }

    if (datosValidados.bastidorVin !== undefined) datosActualizados.bastidorVin = datosValidados.bastidorVin
    if (datosValidados.numeroMotor !== undefined) datosActualizados.numeroMotor = datosValidados.numeroMotor
    if (datosValidados.tipoCombustible !== undefined) datosActualizados.tipoCombustible = datosValidados.tipoCombustible
    if (datosValidados.carroceria !== undefined) datosActualizados.carroceria = datosValidados.carroceria
    if (datosValidados.potenciaCv !== undefined) datosActualizados.potenciaCv = datosValidados.potenciaCv
    if (datosValidados.cilindrada !== undefined) datosActualizados.cilindrada = datosValidados.cilindrada
    if (datosValidados.emisiones !== undefined) datosActualizados.emisiones = datosValidados.emisiones

    if (datosValidados.fechaMatriculacion !== undefined) {
      datosActualizados.fechaMatriculacion = datosValidados.fechaMatriculacion
        ? new Date(datosValidados.fechaMatriculacion)
        : undefined
    }

    if (datosValidados.notas !== undefined) datosActualizados.notas = datosValidados.notas
    if (datosValidados.fichaTecnicaUrl !== undefined) datosActualizados.fichaTecnicaUrl = datosValidados.fichaTecnicaUrl
    if (datosValidados.permisoCirculacionUrl !== undefined) datosActualizados.permisoCirculacionUrl = datosValidados.permisoCirculacionUrl

    // 4. Actualizar entity
    vehiculo.actualizar(datosActualizados)

    // 5. Persistir
    const vehiculoActualizado = await this.vehiculoRepository.actualizar(vehiculo, tallerId)

    // 6. Retornar DTO
    return vehiculoActualizado.toDTO()
  }
}
