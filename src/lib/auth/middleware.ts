/**
 * @fileoverview Middleware de autenticación para APIs
 * @description Funciones para validar autenticación y pertenencia a taller
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface AuthResult {
  userId: string
  email: string
  tallerId: string
}

export interface AuthError {
  error: string
  status: number
}

/**
 * Obtiene el usuario autenticado y su taller_id
 * @returns AuthResult si está autenticado, AuthError si no
 */
export async function getAuthenticatedUser(): Promise<AuthResult | AuthError> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: sessionError } = await supabase.auth.getUser()

    if (sessionError || !user) {
      return { error: 'No autenticado', status: 401 }
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('taller_id')
      .eq('email', session.user.email)
      .single()

    if (usuarioError || !usuario) {
      return { error: 'Usuario no encontrado', status: 403 }
    }

    return {
      userId: session.user.id,
      email: session.user.email!,
      tallerId: usuario.taller_id
    }
  } catch (error) {
    return { error: 'Error de autenticación', status: 500 }
  }
}

/**
 * Verifica si un resultado es un error de autenticación
 */
export function isAuthError(result: AuthResult | AuthError): result is AuthError {
  return 'error' in result
}

/**
 * Crea una respuesta de error de autenticación
 */
export function authErrorResponse(error: AuthError): NextResponse {
  return NextResponse.json({ error: error.error }, { status: error.status })
}

/**
 * Valida que un recurso pertenezca al taller del usuario
 */
export async function validateOwnership(
  table: string,
  resourceId: string,
  tallerId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', resourceId)
    .eq('taller_id', tallerId)
    .single()

  return !error && !!data
}

/**
 * Valida que un cliente pertenezca al taller
 */
export async function validateClientOwnership(
  clienteId: string,
  tallerId: string
): Promise<boolean> {
  return validateOwnership('clientes', clienteId, tallerId)
}

/**
 * Valida que un vehículo pertenezca al taller
 */
export async function validateVehicleOwnership(
  vehiculoId: string,
  tallerId: string
): Promise<boolean> {
  return validateOwnership('vehiculos', vehiculoId, tallerId)
}

/**
 * Valida que una orden pertenezca al taller
 */
export async function validateOrderOwnership(
  ordenId: string,
  tallerId: string
): Promise<boolean> {
  return validateOwnership('ordenes_reparacion', ordenId, tallerId)
}

/**
 * Valida que una factura pertenezca al taller
 */
export async function validateInvoiceOwnership(
  facturaId: string,
  tallerId: string
): Promise<boolean> {
  return validateOwnership('facturas', facturaId, tallerId)
}
