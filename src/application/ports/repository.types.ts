/**
 * Shared types for repository interfaces
 */

export interface PaginacionOpciones {
  page: number
  pageSize: number
}

export interface ResultadoPaginado<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
