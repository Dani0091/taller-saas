/**
 * @fileoverview Barrel Export - Sistema de Errores
 * @description Exporta todos los errores para fácil importación
 */

export { AppError } from './AppError'
export {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
  DependencyError,
  BusinessRuleError,
  UnauthorizedError
} from './DomainErrors'
