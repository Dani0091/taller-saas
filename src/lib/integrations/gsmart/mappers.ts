/**
 * @fileoverview Mappers para convertir datos entre TallerAgil y GSmart
 * @description Funciones para transformar estructuras de datos
 */

import { Orden, Vehiculo, LineaOrden } from '@/lib/ordenes/types'
import { GSmartOrden, GSmartVehiculo, GSmartTrabajo, GSmartPieza } from './types'

// ============================================
// MAPPERS: TallerAgil → GSmart
// ============================================

/**
 * Convierte un vehículo de TallerAgil a formato GSmart
 */
export function vehiculoToGSmart(vehiculo: Vehiculo): GSmartVehiculo {
  return {
    matricula: vehiculo.matricula,
    marca: vehiculo.marca,
    modelo: vehiculo.modelo,
    vin: vehiculo.vin,
    kilometros: vehiculo.kilometros,
    ano: vehiculo.año,
    color: vehiculo.color,
    combustible: mapCombustible(vehiculo.tipo_combustible)
  }
}

/**
 * Convierte una orden de TallerAgil a formato GSmart
 */
export function ordenToGSmart(
  orden: Orden,
  vehiculo: Vehiculo,
  lineas: LineaOrden[]
): GSmartOrden {
  const trabajos = lineas
    .filter(l => l.tipo === 'mano_obra')
    .map(lineaToGSmartTrabajo)

  const piezas = lineas
    .filter(l => l.tipo === 'pieza' || l.tipo === 'consumible')
    .map(lineaToGSmartPieza)

  return {
    numero: orden.numero_orden,
    fecha_entrada: orden.fecha_entrada,
    fecha_salida_estimada: orden.fecha_salida_estimada || undefined,
    vehiculo: vehiculoToGSmart(vehiculo),
    estado: mapEstadoOrden(orden.estado),
    descripcion_problema: orden.descripcion_problema || undefined,
    diagnostico: orden.diagnostico || undefined,
    trabajos,
    piezas,
    total_estimado: orden.presupuesto_aceptado || undefined,
    total_final: orden.importe_final || undefined
  }
}

function lineaToGSmartTrabajo(linea: LineaOrden): GSmartTrabajo {
  return {
    descripcion: linea.descripcion,
    horas: linea.horas || 0,
    precio_hora: linea.precio_unitario,
    operario: linea.operario_nombre
  }
}

function lineaToGSmartPieza(linea: LineaOrden): GSmartPieza {
  return {
    referencia: linea.referencia,
    descripcion: linea.descripcion,
    cantidad: linea.cantidad,
    precio_unitario: linea.precio_unitario,
    precio_coste: linea.precio_coste,
    proveedor: linea.proveedor
  }
}

// ============================================
// MAPPERS: GSmart → TallerAgil
// ============================================

/**
 * Convierte un vehículo de GSmart a formato TallerAgil
 */
export function gsmartToVehiculo(
  gsmartVehiculo: GSmartVehiculo,
  tallerId: string,
  clienteId: string
): Partial<Vehiculo> {
  return {
    taller_id: tallerId,
    cliente_id: clienteId,
    matricula: gsmartVehiculo.matricula,
    marca: gsmartVehiculo.marca,
    modelo: gsmartVehiculo.modelo,
    vin: gsmartVehiculo.vin,
    kilometros: gsmartVehiculo.kilometros,
    año: gsmartVehiculo.ano,
    color: gsmartVehiculo.color,
    tipo_combustible: reverseMapCombustible(gsmartVehiculo.combustible)
  }
}

// ============================================
// HELPERS DE MAPEO
// ============================================

function mapCombustible(
  tipo?: string
): GSmartVehiculo['combustible'] | undefined {
  if (!tipo) return undefined

  const map: Record<string, GSmartVehiculo['combustible']> = {
    'gasolina': 'gasolina',
    'diesel': 'diesel',
    'diésel': 'diesel',
    'híbrido': 'hibrido',
    'hibrido': 'hibrido',
    'eléctrico': 'electrico',
    'electrico': 'electrico',
    'glp': 'glp',
    'gnc': 'gnc'
  }

  return map[tipo.toLowerCase()] || undefined
}

function reverseMapCombustible(
  tipo?: GSmartVehiculo['combustible']
): string | undefined {
  if (!tipo) return undefined

  const map: Record<NonNullable<GSmartVehiculo['combustible']>, string> = {
    'gasolina': 'Gasolina',
    'diesel': 'Diésel',
    'hibrido': 'Híbrido',
    'electrico': 'Eléctrico',
    'glp': 'GLP',
    'gnc': 'GNC'
  }

  return map[tipo]
}

function mapEstadoOrden(estado: string): GSmartOrden['estado'] {
  const map: Record<string, GSmartOrden['estado']> = {
    'recibido': 'recibido',
    'diagnostico': 'diagnostico',
    'presupuestado': 'presupuesto',
    'aprobado': 'aprobado',
    'en_reparacion': 'reparacion',
    'completado': 'completado',
    'entregado': 'entregado',
    'cancelado': 'completado' // GSmart no tiene 'cancelado'
  }

  return map[estado] || 'recibido'
}
