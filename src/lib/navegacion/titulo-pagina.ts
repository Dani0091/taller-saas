/**
 * @fileoverview Título y subtítulo de la cabecera según la ruta
 * @description Coincidencia por el prefijo más largo: las subpáginas
 * (/dashboard/clientes/nuevo, /dashboard/facturas/ver…) heredan el título de
 * su sección en lugar de caer en "Dashboard".
 */

export interface TituloPagina {
  title: string
  subtitle: string
}

const TITULOS: Record<string, TituloPagina> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Vista general del taller' },
  '/dashboard/ordenes': { title: 'Órdenes', subtitle: 'Gestión de reparaciones' },
  '/dashboard/citas': { title: 'Citas', subtitle: 'Citas, recordatorios e ITV' },
  '/dashboard/clientes': { title: 'Clientes', subtitle: 'Base de datos de clientes' },
  '/dashboard/clientes/nuevo': { title: 'Nuevo cliente', subtitle: 'Alta de cliente' },
  '/dashboard/vehiculos': { title: 'Vehículos', subtitle: 'Flota de vehículos' },
  '/dashboard/vehiculos/nuevo': { title: 'Nuevo vehículo', subtitle: 'Alta de vehículo' },
  '/dashboard/facturas': { title: 'Facturas', subtitle: 'Facturación y cobros' },
  '/dashboard/facturas/nueva': { title: 'Nueva factura', subtitle: 'Facturación y cobros' },
  '/dashboard/facturas/rapida': { title: 'Factura rápida', subtitle: 'Cobro inmediato' },
  '/dashboard/facturas/ver': { title: 'Factura', subtitle: 'Detalle de la factura' },
  '/dashboard/configuracion': { title: 'Configuración', subtitle: 'Ajustes del taller' },
}

export function tituloDePagina(pathname: string | null): TituloPagina {
  const ruta = (pathname ?? '/dashboard').replace(/\/+$/, '') || '/dashboard'
  let mejor = '/dashboard'
  for (const prefijo of Object.keys(TITULOS)) {
    if ((ruta === prefijo || ruta.startsWith(prefijo + '/')) && prefijo.length > mejor.length) {
      mejor = prefijo
    }
  }
  return TITULOS[mejor]
}
