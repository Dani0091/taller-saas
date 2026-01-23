/**
 * @fileoverview Errores de Infraestructura
 * @description Errores relacionados con servicios externos, BD, red, etc.
 * Estos errores NO son esperados y deben loguearse para debugging
 */

import { AppError } from '@/domain/errors/AppError'

/**
 * Error de base de datos genérico
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Error al conectar con la base de datos',
    public readonly originalError?: unknown
  ) {
    super(message, 'DATABASE_ERROR', 500, false)
  }
}

/**
 * Error de servicio externo (API, integraciones)
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string = 'Error al comunicarse con el servicio externo',
    public readonly originalError?: unknown
  ) {
    super(`${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, false)
  }
}

/**
 * Error inesperado (catch-all)
 */
export class UnexpectedError extends AppError {
  constructor(
    message: string = 'Ha ocurrido un error inesperado',
    public readonly originalError?: unknown
  ) {
    super(message, 'UNEXPECTED_ERROR', 500, false)
  }
}

/**
 * Error de timeout
 */
export class TimeoutError extends AppError {
  constructor(operation: string) {
    super(
      `La operación '${operation}' excedió el tiempo límite`,
      'TIMEOUT_ERROR',
      504,
      false
    )
  }
}
