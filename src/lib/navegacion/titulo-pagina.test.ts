import { describe, it, expect } from 'vitest'
import { tituloDePagina } from './titulo-pagina'

describe('tituloDePagina', () => {
  it.each([
    ['/dashboard', 'Inicio'],
    ['/dashboard/', 'Inicio'],
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
    expect(tituloDePagina('/dashboard/facturasx').title).toBe('Inicio')
  })

  it('ruta nula o desconocida → Inicio', () => {
    expect(tituloDePagina(null).title).toBe('Inicio')
    expect(tituloDePagina('/otra').title).toBe('Inicio')
  })
})
