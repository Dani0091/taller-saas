/**
 * @fileoverview Lectura segura del cuerpo JSON de una petición
 * @description request.json() lanza con un cuerpo malformado y las rutas
 * acababan respondiendo 500. Aquí se devuelve null para responder 400.
 */

import type { NextRequest } from 'next/server'

export async function leerJson(request: NextRequest | Request): Promise<unknown | null> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
