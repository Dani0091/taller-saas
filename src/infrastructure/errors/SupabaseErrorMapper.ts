/**
 * @fileoverview Mapeador de Errores de Supabase/PostgreSQL
 * @description Traduce códigos de error de Postgres a errores de dominio
 *
 * TABLA DE REFERENCIA:
 * | Código Postgres | Error Supabase      | Error de Dominio     |
 * |-----------------|---------------------|----------------------|
 * | 23505           | Unique Violation    | ConflictError        |
 * | 23503           | ForeignKey Violation| DependencyError      |
 * | 42703           | Undefined Column    | InfrastructureError  |
 * | PGRST116        | JSON object empty   | NotFoundError        |
 */

import { AppError } from '@/domain/errors/AppError'
import {
  NotFoundError,
  ConflictError,
  DependencyError,
  ValidationError,
  ForbiddenError
} from '@/domain/errors/DomainErrors'
import {
  DatabaseError,
  UnexpectedError
} from './InfrastructureErrors'

interface SupabaseError {
  code?: string
  message?: string
  details?: string
  hint?: string
}

export class SupabaseErrorMapper {
  /**
   * Mapea un error de Supabase a un error de dominio o infraestructura
   */
  static toDomainError(error: SupabaseError | unknown): AppError {
    // Si ya es un AppError, retornarlo tal cual
    if (error instanceof AppError) {
      return error
    }

    // Si no tiene estructura de error de Supabase, error inesperado
    if (!error || typeof error !== 'object') {
      return new UnexpectedError('Error desconocido', error)
    }

    const supabaseError = error as SupabaseError
    const code = supabaseError.code || ''
    const message = supabaseError.message || 'Error desconocido'

    // Mapeo de códigos de PostgreSQL
    switch (code) {
      // 23505: Unique constraint violation
      case '23505':
        return this.handleUniqueViolation(message)

      // 23503: Foreign key violation
      case '23503':
        return this.handleForeignKeyViolation(message)

      // 23502: Not null violation
      case '23502':
        return new ValidationError('Campo obligatorio faltante')

      // 42703: Undefined column (error de schema)
      case '42703':
        return new DatabaseError('Error de esquema de base de datos', error)

      // PGRST116: No rows found
      case 'PGRST116':
        return new NotFoundError('recurso solicitado')

      // PGRST301: JWT expired
      case 'PGRST301':
      case 'PGRST302':
        return new ForbiddenError('Sesión expirada, por favor inicia sesión nuevamente')

      // 42P01: Undefined table
      case '42P01':
        return new DatabaseError('Error de configuración de base de datos', error)

      // Error de conexión
      case 'ECONNREFUSED':
      case 'ETIMEDOUT':
        return new DatabaseError('No se pudo conectar con la base de datos', error)

      default:
        // Log del error original para debugging
        console.error('[SupabaseErrorMapper] Error no mapeado:', {
          code,
          message,
          details: supabaseError.details
        })
        return new DatabaseError(message, error)
    }
  }

  /**
   * Maneja errores de unique constraint
   * Intenta extraer el nombre del campo del mensaje
   */
  private static handleUniqueViolation(message: string): ConflictError {
    // Intentar extraer el campo del mensaje
    // Ejemplo: "duplicate key value violates unique constraint "clientes_email_key""
    const fieldMatch = message.match(/clientes_(\w+)_key/)
    const field = fieldMatch ? fieldMatch[1] : 'campo único'

    return new ConflictError('registro', field, 'valor duplicado')
  }

  /**
   * Maneja errores de foreign key constraint
   */
  private static handleForeignKeyViolation(message: string): DependencyError {
    // Intentar identificar la tabla dependiente
    const tableMatch = message.match(/on table "(\w+)"/)
    const table = tableMatch ? tableMatch[1] : 'recursos'

    return new DependencyError('registro', table)
  }

  /**
   * Verifica si el error es de permisos RLS
   */
  static isPermissionError(error: SupabaseError | unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const supabaseError = error as SupabaseError
      const message = supabaseError.message || ''
      return (
        message.includes('policy') ||
        message.includes('permission') ||
        message.includes('RLS')
      )
    }
    return false
  }
}
