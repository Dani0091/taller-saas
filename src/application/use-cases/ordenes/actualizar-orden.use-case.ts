/**
 * @fileoverview Use Case: Actualizar Orden
 * @description Actualiza una orden de reparación existente
 *
 * RESPONSABILIDAD ÚNICA: Orquestar la actualización de una orden
 * - Valida el DTO de entrada
 * - Verifica que la orden existe
 * - Aplica las modificaciones a la entity
 * - Persiste en el repositorio
 * - Retorna el DTO de respuesta
 *
 * REGLA DE NEGOCIO: No se pueden modificar órdenes facturadas
 */

import { IOrdenRepository } from '@/application/ports'
import { ActualizarOrdenDTO, ActualizarOrdenSchema, OrdenResponseDTO } from '@/application/dtos'
import { Precio, Kilometraje } from '@/domain/value-objects'
import { NotFoundError, BusinessRuleError, ValidationError } from '@/domain/errors'

export class ActualizarOrdenUseCase {
  constructor(private readonly ordenRepository: IOrdenRepository) {}

  async execute(
    ordenId: string,
    dto: ActualizarOrdenDTO,
    tallerId: string,
    userId: string
  ): Promise<OrdenResponseDTO> {
    // 1. Validar DTO de entrada
    const validacion = ActualizarOrdenSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Datos inválidos: ${errores.join(', ')}`)
    }

    const datosValidados = validacion.data

    // 2. Obtener la orden existente
    const orden = await this.ordenRepository.obtenerPorId(ordenId, tallerId)
    if (!orden) {
      throw new NotFoundError('orden', ordenId)
    }

    // 3. Verificar que se puede modificar (regla de negocio)
    if (!orden.puedeModificarse()) {
      throw new BusinessRuleError('No se puede modificar una orden facturada o eliminada')
    }

    // 4. Aplicar modificaciones (usando los mutadores de la entity)
    // NOTA: Como la entity tiene propiedades privadas, necesitamos recrearla
    // En producción, podrías agregar métodos de actualización específicos

    // Por ahora, obtenemos los datos actuales y los mezclamos con los nuevos
    const ordenActual = orden.toPlainObject()

    const ordenActualizada = (orden.constructor as any).create({
      ...ordenActual,
      // Aplicar cambios del DTO
      ...(datosValidados.clienteId && { clienteId: datosValidados.clienteId }),
      ...(datosValidados.vehiculoId && { vehiculoId: datosValidados.vehiculoId }),
      ...(datosValidados.operarioId !== undefined && { operarioId: datosValidados.operarioId }),
      ...(datosValidados.descripcionProblema !== undefined && {
        descripcionProblema: datosValidados.descripcionProblema
      }),
      ...(datosValidados.diagnostico !== undefined && {
        diagnostico: datosValidados.diagnostico
      }),
      ...(datosValidados.trabajosRealizados !== undefined && {
        trabajosRealizados: datosValidados.trabajosRealizados
      }),
      ...(datosValidados.notas !== undefined && { notas: datosValidados.notas }),
      ...(datosValidados.presupuestoAprobadoPorCliente !== undefined && {
        presupuestoAprobadoPorCliente: datosValidados.presupuestoAprobadoPorCliente
      }),
      ...(datosValidados.tiempoEstimadoHoras !== undefined && {
        tiempoEstimadoHoras: datosValidados.tiempoEstimadoHoras
      }),
      ...(datosValidados.tiempoRealHoras !== undefined && {
        tiempoRealHoras: datosValidados.tiempoRealHoras
      }),
      ...(datosValidados.kilometrosEntrada !== undefined && {
        kilometrosEntrada: Kilometraje.create(datosValidados.kilometrosEntrada)
      }),
      ...(datosValidados.nivelCombustible !== undefined && {
        nivelCombustible: datosValidados.nivelCombustible
      }),
      ...(datosValidados.renunciaPresupuesto !== undefined && {
        renunciaPresupuesto: datosValidados.renunciaPresupuesto
      }),
      ...(datosValidados.accionImprevisto !== undefined && {
        accionImprevisto: datosValidados.accionImprevisto
      }),
      ...(datosValidados.recogerPiezas !== undefined && {
        recogerPiezas: datosValidados.recogerPiezas
      }),
      ...(datosValidados.danosCarroceria !== undefined && {
        danosCarroceria: datosValidados.danosCarroceria
      }),
      ...(datosValidados.costeDiarioEstancia !== undefined && {
        costeDiarioEstancia: Precio.create(datosValidados.costeDiarioEstancia)
      }),
      ...(datosValidados.fotosEntrada && { fotosEntrada: datosValidados.fotosEntrada }),
      ...(datosValidados.fotosSalida && { fotosSalida: datosValidados.fotosSalida }),
      ...(datosValidados.fotosDiagnostico && {
        fotosDiagnostico: datosValidados.fotosDiagnostico
      }),
      // Actualizar timestamp
      updatedAt: new Date()
    })

    // 5. Persistir en el repositorio
    const ordenPersistida = await this.ordenRepository.actualizar(ordenActualizada, tallerId)

    // 6. Retornar DTO de respuesta
    return ordenPersistida.toDTO()
  }
}
