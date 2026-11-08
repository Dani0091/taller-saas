/**
 * @fileoverview Mensajes de WhatsApp de órdenes y presupuestos
 * @description Texto único para cada envío. Los datos opcionales que faltan no
 * dejan "undefined", "null" ni saludos con huecos ("Hola ,").
 */

import { ESTADOS_ORDEN } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'

const unir = (partes: Array<string | null | undefined | false>, sep = ' ') =>
  partes.filter((p): p is string => typeof p === 'string' && p.trim() !== '').map((p) => p.trim()).join(sep)

/** Presupuesto para aceptar online. */
export function mensajePresupuesto(datos: { nombreCliente?: string | null; enlace: string; nombreTaller?: string | null }): string {
  const saludo = unir(['Hola', datos.nombreCliente])
  const taller = datos.nombreTaller?.trim() ? ` de ${datos.nombreTaller.trim()}` : ''
  return [
    `${saludo}, te enviamos el presupuesto de tu vehículo${taller}.`,
    '',
    `📋 Ver presupuesto: ${datos.enlace}`,
    '',
    'Puedes aceptarlo directamente desde el enlace.',
  ].join('\n')
}

export interface DatosMensajeOrden {
  taller: { nombre?: string | null; telefono?: string | null }
  orden: { numero?: string | null; estado?: string | null; descripcionProblema?: string | null }
  cliente: { nombre?: string | null; apellidos?: string | null }
  vehiculo: { marca?: string | null; modelo?: string | null; matricula?: string | null; kilometros?: number | null }
  totales: { total?: number | null }
}

/** Resumen de la orden de trabajo. */
export function mensajeOrden(d: DatosMensajeOrden): string {
  const estado = ESTADOS_ORDEN.find((e) => e.value === d.orden.estado)?.label ?? d.orden.estado
  const bloques = [
    [d.orden.numero ? `📋 *ORDEN DE TRABAJO ${d.orden.numero}*` : '📋 *ORDEN DE TRABAJO*'],
    [d.taller.nombre && `🏢 ${d.taller.nombre}`, d.taller.telefono && `📞 ${d.taller.telefono}`],
    [
      unir([d.cliente.nombre, d.cliente.apellidos]) && `👤 Cliente: ${unir([d.cliente.nombre, d.cliente.apellidos])}`,
      unir([d.vehiculo.marca, d.vehiculo.modelo]) && `🚗 Vehículo: ${unir([d.vehiculo.marca, d.vehiculo.modelo])}`,
      d.vehiculo.matricula && `🔖 Matrícula: ${d.vehiculo.matricula}`,
      d.vehiculo.kilometros != null && `⏱️ Km: ${d.vehiculo.kilometros.toLocaleString('es-ES')}`,
    ],
    [d.orden.descripcionProblema && `📌 Problema: ${d.orden.descripcionProblema}`],
    [d.totales.total != null && `💰 Total estimado: ${formatCurrency(d.totales.total)}`, estado && `Estado: ${estado}`],
  ]
  return bloques.map((b) => unir(b, '\n')).filter(Boolean).join('\n\n')
}
