/**
 * @fileoverview Use Case: Crear Vehículo
 * @description Crea un nuevo vehículo en el taller
 */

import { IVehiculoRepository } from '@/application/ports'
import { CrearVehiculoDTO, CrearVehiculoSchema, VehiculoResponseDTO } from '@/application/dtos/vehiculo.dto'
import { VehiculoEntity } from '@/domain/entities'
import { Matricula, VIN, Kilometraje } from '@/domain/value-objects'
import { ValidationError } from '@/domain/errors'

export class CrearVehiculoUseCase {
  constructor(private readonly vehiculoRepository: IVehiculoRepository) {}

  async execute(
    dto: CrearVehiculoDTO,
    tallerId: string
  ): Promise<VehiculoResponseDTO> {
    // 1. Validar DTO
    const validacion = CrearVehiculoSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Datos inválidos: ${errores.join(', ')}`)
    }

    const datosValidados = validacion.data

    // 2. Crear Value Objects
    const matricula = Matricula.create(datosValidados.matricula)
    const vin = datosValidados.vin ? VIN.create(datosValidados.vin) : undefined
    const kilometros = datosValidados.kilometros ? Kilometraje.create(datosValidados.kilometros) : undefined

    // 3. Crear entity
    const vehiculo = VehiculoEntity.create({
      id: crypto.randomUUID(),
      tallerId,
      clienteId: datosValidados.clienteId,
      matricula,
      marca: datosValidados.marca,
      modelo: datosValidados.modelo,
      año: datosValidados.año,
      color: datosValidados.color,
      kilometros,
      vin,
      bastidorVin: datosValidados.bastidorVin,
      numeroMotor: datosValidados.numeroMotor,
      tipoCombustible: datosValidados.tipoCombustible,
      carroceria: datosValidados.carroceria,
      potenciaCv: datosValidados.potenciaCv,
      cilindrada: datosValidados.cilindrada,
      emisiones: datosValidados.emisiones,
      fechaMatriculacion: datosValidados.fechaMatriculacion ? new Date(datosValidados.fechaMatriculacion) : undefined,
      notas: datosValidados.notas,
      fichaTecnicaUrl: datosValidados.fichaTecnicaUrl,
      permisoCirculacionUrl: datosValidados.permisoCirculacionUrl,
      ocrProcesado: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // 4. Persistir
    const vehiculoCreado = await this.vehiculoRepository.crear(vehiculo, tallerId)

    // 5. Retornar DTO
    return vehiculoCreado.toDTO()
  }
}
