/**
 * @fileoverview Sistema de Errores Atómicos - Base
 * @description Clase base para todos los errores de la aplicación
 * Siguiendo el principio: "Un error debe ser descriptivo y accionable"
 */

export abstract class AppError extends Error {
  public readonly timestamp: Date
  public readonly isOperational: boolean

  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.timestamp = new Date()
    this.isOperational = isOperational

    // Mantener el stack trace correcto
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      isOperational: this.isOperational
    }
  }
}
