import { describe, it, expect } from 'vitest'
import { tituloDePagina } from './titulo-pagina'

describe('tituloDePagina', () => {
  it.each([
    ['/dashboard', 'Dashboard'],
    ['/dashboard/', 'Dashboard'],
    ['/dashboard/citas', 'Citas'],
    ['/dashboard/clientes', 'Clientes'],
    ['/dashboard/clientes/nuevo', 'Nuevo cliente'],
    ['/dashboard/clientes/123/editar', 'Clientes'],
    ['/dashboard/facturas/ver', 'Factura'],
    ['/dashboard/facturas/rapida', 'Factura rápida'],
    ['/dashboard/vehiculos/nuevo', 'Nuevo vehículo'],
    ['/dashboard/configuracion', 'Configuración'],
  ])('%s → %s', (ruta, titulo) => {
    expect(tituloDePagina(ruta).title).toBe(titulo)
  })

  it('no confunde prefijos parciales (/dashboard/facturasx)', () => {
    expect(tituloDePagina('/dashboard/facturasx').title).toBe('Dashboard')
  })

  it('ruta nula o desconocida → Dashboard', () => {
    expect(tituloDePagina(null).title).toBe('Dashboard')
    expect(tituloDePagina('/otra').title).toBe('Dashboard')
  })
})
