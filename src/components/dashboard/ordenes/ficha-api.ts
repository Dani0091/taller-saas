/**
 * @fileoverview Llamadas de la ficha de orden a la API
 * @description Todo lo que la ficha lee o escribe pasa por aquí (antes iba
 * directo a Supabase desde el navegador). Cada función lanza un Error con el
 * mensaje de la API si la respuesta no es correcta.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- filas de Supabase sin tipar, igual que el estado de la ficha */

import type { VehiculoResultadoBusqueda } from './parts/OrdenVehiculoStep'

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init?.body ? { ...init, headers: { 'Content-Type': 'application/json' } } : init)
  const datos = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(datos.error || 'No se pudo completar la operación')
  return datos as T
}

const json = (method: string, cuerpo: unknown): RequestInit => ({ method, body: JSON.stringify(cuerpo) })

export interface ContextoFicha {
  tallerId: string
  config: { tarifa_hora: number | null; porcentaje_iva: number | null; serie_factura: string | null } | null
  series: { id: string; nombre: string; prefijo: string; es_predeterminada: boolean }[]
  clientes: any[]
  orden: Record<string, any> | null
  lineas: any[]
  siguienteNumero: string | null
}

export const cargarContextoFicha = (ordenId?: string | null) =>
  pedir<ContextoFicha>(`/api/ordenes/ficha${ordenId ? `?orden=${encodeURIComponent(ordenId)}` : ''}`)

export interface LineaNueva {
  tipo: string
  descripcion: string
  cantidad: number
  precio_unitario: number
}

export const crearOrdenFicha = (orden: Record<string, unknown>, lineas: LineaNueva[]) =>
  pedir<{ orden: { id: string; numero_orden: string } }>('/api/ordenes/ficha', json('POST', { orden, lineas }))

export const guardarOrdenFicha = (
  id: string,
  orden: Record<string, unknown>,
  lineas?: { id: string; cantidad: number; precio_unitario: number }[]
) => pedir<{ ok: true }>('/api/ordenes/ficha', json('PATCH', { id, orden, lineas }))

export const añadirLineaFicha = (ordenId: string, linea: LineaNueva) =>
  pedir<{ id: string }>('/api/ordenes/ficha/lineas', json('POST', { orden_id: ordenId, ...linea }))

export const actualizarLineaFicha = (id: string, cambios: { cantidad?: number; precio_unitario?: number }) =>
  pedir<{ ok: true }>('/api/ordenes/ficha/lineas', json('PATCH', { id, ...cambios }))

export const borrarLineaFicha = (id: string) =>
  pedir<{ ok: true }>(`/api/ordenes/ficha/lineas?id=${encodeURIComponent(id)}`, { method: 'DELETE' })

export const vehiculosDeCliente = (clienteId: string) =>
  pedir<any[]>(`/api/vehiculos?cliente_id=${encodeURIComponent(clienteId)}`)

export const vehiculoPorId = async (id: string) =>
  (await pedir<any[]>(`/api/vehiculos?id=${encodeURIComponent(id)}`))[0] ?? null

/** Matrícula exacta, o las que la contienen (hasta 8), con su cliente. */
export const buscarVehiculos = (matricula: string, exacta = false) =>
  pedir<VehiculoResultadoBusqueda[]>(
    `/api/vehiculos?matricula=${encodeURIComponent(matricula)}&con_cliente=1&limite=8${exacta ? '&exacta=1' : ''}`
  )

export const crearVehiculoFicha = (vehiculo: Record<string, unknown>) =>
  pedir<any>('/api/vehiculos', json('POST', vehiculo))

export const actualizarVehiculoFicha = (id: string, cambios: Record<string, unknown>) =>
  pedir<any>('/api/vehiculos', json('PATCH', { id, ...cambios }))

export const crearClienteFicha = async (cliente: Record<string, unknown>) =>
  (await pedir<{ cliente: any }>('/api/clientes/crear', json('POST', cliente))).cliente
