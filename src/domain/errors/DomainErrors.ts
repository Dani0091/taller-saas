/**
 * @fileoverview Errores de Dominio (Business Logic Errors)
 * @description Errores que representan violaciones de reglas de negocio
 * Estos errores son ESPERADOS y deben mostrarse al usuario
 */

import { AppError } from './AppError'

/**
 * Error cuando un recurso no existe
 * Ejemplo: "No se encontró la orden con ID: abc123"
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `No se encontró ${resource} con ID: ${identifier}`
      : `No se encontró ${resource}`
    super(message, 'NOT_FOUND', 404)
  }
}

/**
 * Error cuando se intenta crear un recurso que ya existe
 * Ejemplo: "Ya existe un cliente con el email: user@example.com"
 */
export class ConflictError extends AppError {
  constructor(resource: string, field: string, value: string) {
    super(
      `Ya existe ${resource} con ${field}: ${value}`,
      'CONFLICT',
      409
    )
  }
}

/**
 * Error de validación de datos
 * Ejemplo: "El precio no puede ser negativo"
 */
export class ValidationError extends AppError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400)
  }
}

/**
 * Error cuando no se tiene permiso para realizar una acción
 * Ejemplo: "No tienes permiso para ver las órdenes de otro taller"
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'No tienes permiso para realizar esta acción') {
    super(message, 'FORBIDDEN', 403)
  }
}

/**
 * Error cuando hay una dependencia que impide la operación
 * Ejemplo: "No se puede eliminar el cliente porque tiene órdenes asociadas"
 */
export class DependencyError extends AppError {
  constructor(resource: string, dependency: string) {
    super(
      `No se puede eliminar ${resource} porque tiene ${dependency} asociados`,
      'DEPENDENCY_ERROR',
      409
    )
  }
}

/**
 * Error de lógica de negocio genérico
 * Ejemplo: "No puedes facturar una orden sin líneas"
 */
export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 'BUSINESS_RULE_VIOLATION', 422)
  }
}

/**
 * Error cuando el usuario no está autenticado
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Debes iniciar sesión para realizar esta acción') {
    super(message, 'UNAUTHORIZED', 401)
  }
}
