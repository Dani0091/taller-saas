/**
 * @fileoverview Use Case: Crear Orden
 * @description Crea una nueva orden de reparación
 *
 * RESPONSABILIDAD ÚNICA: Orquestar la creación de una orden
 * - Valida el DTO de entrada
 * - Genera el número de orden
 * - Crea la entity con sus líneas
 * - Persiste en el repositorio
 * - Retorna el DTO de respuesta
 *
 * VENTAJA: Si mañana cambias la lógica de numeración o validación,
 * solo modificas ESTE archivo, no afectas al repository ni al dominio
 */

import { IOrdenRepository } from '@/application/ports'
import { CrearOrdenDTO, CrearOrdenSchema, OrdenResponseDTO } from '@/application/dtos'
import { OrdenEntity, LineaOrdenEntity } from '@/domain/entities'
import { Precio, Kilometraje } from '@/domain/value-objects'
import { EstadoOrden, TipoLinea, EstadoLineaOrden, AccionImprevisto } from '@/domain/types'
import { ValidationError } from '@/domain/errors'
import { generarSiguienteNumero } from '@/domain/logic'

export class CrearOrdenUseCase {
  constructor(private readonly ordenRepository: IOrdenRepository) {}

  async execute(
    dto: CrearOrdenDTO,
    tallerId: string,
    userId: string
  ): Promise<OrdenResponseDTO> {
    // 1. Validar DTO de entrada
    const validacion = CrearOrdenSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Datos inválidos: ${errores.join(', ')}`)
    }

    const datosValidados = validacion.data

    // 2. Generar número de orden
    const añoActual = new Date().getFullYear()
    const ultimoNumero = await this.ordenRepository.obtenerUltimoNumeroOrden(
      tallerId,
      añoActual
    )
    const numeroOrden = generarSiguienteNumero(ultimoNumero || undefined)

    // 3. Crear líneas de orden (si existen)
    const lineas: LineaOrdenEntity[] = []
    if (datosValidados.lineas && datosValidados.lineas.length > 0) {
      for (const lineaDTO of datosValidados.lineas) {
        const linea = LineaOrdenEntity.create({
          id: this.generarId(),
          ordenId: '', // Se asignará después de crear la orden
          tipo: lineaDTO.tipo,
          descripcion: lineaDTO.descripcion,
          cantidad: lineaDTO.cantidad,
          precioUnitario: Precio.create(lineaDTO.precioUnitario),
          estado: EstadoLineaOrden.PRESUPUESTADO
        })
        lineas.push(linea)
      }
    }

    // 4. Crear entity de orden
    const orden = OrdenEntity.create({
      id: this.generarId(),
      tallerId,
      numeroOrden,
      clienteId: datosValidados.clienteId,
      vehiculoId: datosValidados.vehiculoId,
      operarioId: datosValidados.operarioId,
      descripcionProblema: datosValidados.descripcionProblema,
      diagnostico: datosValidados.diagnostico,
      trabajosRealizados: datosValidados.trabajosRealizados,
      notas: datosValidados.notas,
      presupuestoAprobadoPorCliente: datosValidados.presupuestoAprobadoPorCliente,
      tiempoEstimadoHoras: datosValidados.tiempoEstimadoHoras,
      tiempoRealHoras: datosValidados.tiempoRealHoras,
      kilometrosEntrada: datosValidados.kilometrosEntrada
        ? Kilometraje.create(datosValidados.kilometrosEntrada)
        : undefined,
      nivelCombustible: datosValidados.nivelCombustible,
      renunciaPresupuesto: datosValidados.renunciaPresupuesto,
      accionImprevisto: datosValidados.accionImprevisto,
      recogerPiezas: datosValidados.recogerPiezas,
      danosCarroceria: datosValidados.danosCarroceria,
      costeDiarioEstancia: datosValidados.costeDiarioEstancia
        ? Precio.create(datosValidados.costeDiarioEstancia)
        : undefined,
      fotosEntrada: datosValidados.fotosEntrada,
      fotosSalida: datosValidados.fotosSalida,
      fotosDiagnostico: datosValidados.fotosDiagnostico,
      estado: EstadoOrden.RECIBIDO, // Estado inicial
      lineas,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // 5. Asignar el ordenId a las líneas
    lineas.forEach(linea => {
      // Hack: acceder a la propiedad privada para asignar el ordenId
      // En producción, esto debería hacerse de manera más elegante
      (linea as any).ordenId = orden.getId()
    })

    // 6. Persistir en el repositorio
    const ordenCreada = await this.ordenRepository.crear(orden, tallerId)

    // 7. Retornar DTO de respuesta
    return ordenCreada.toDTO()
  }

  /**
   * Genera un ID único (UUID v4 simplificado)
   * En producción, usar una librería como 'uuid'
   */
  private generarId(): string {
    return crypto.randomUUID()
  }
}
