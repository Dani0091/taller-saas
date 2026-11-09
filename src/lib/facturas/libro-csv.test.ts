import { describe, it, expect } from 'vitest'
import { libroFacturasCsv, celdaCsv, importeCsv, type FacturaLibro } from './libro-csv'

const f = (extra: Partial<FacturaLibro>): FacturaLibro => ({
  numero_factura: 'QA-001', fecha_emision: '2026-10-05', estado: 'pagada', cliente_nombre: 'Ana García', cliente_nif: '12345678Z',
  base_imponible: 1000, iva_porcentaje: 21, iva: 210, total: 1210, ...extra,
})

describe('libro de facturas emitidas (CSV)', () => {
  const csv = libroFacturasCsv([
    f({}),
    f({ numero_factura: 'QA-002', estado: 'emitida', base_imponible: 100, iva_porcentaje: 0, iva: 0, total: 100, cliente_nombre: 'Taller; "El Sur"' }),
    f({ numero_factura: 'QA-003', estado: 'anulada', base_imponible: 500, iva: 105, total: 605 }),
    f({ numero_factura: 'FS-001', es_simplificada: true, cliente_nombre: null, cliente_nif: null, base_imponible: 50, iva: 10.5, total: 60.5 }),
  ], 'Libro de facturas emitidas 4T 2026')
  const lineas = csv.replace('﻿', '').split('\r\n')

  it('BOM, CRLF y separador «;» para que Excel en español lo abra bien', () => {
    expect(csv.startsWith('﻿')).toBe(true)
    expect(lineas[1]).toBe('Número;Fecha expedición;Tipo;Estado;Cliente;NIF cliente;Base imponible;Tipo IVA (%);Cuota IVA;Total')
  })

  it('fechas dd/mm/aaaa y coma decimal sin miles', () => {
    expect(lineas[2]).toBe('QA-001;05/10/2026;Completa;Pagada;Ana García;12345678Z;1000,00;21,00;210,00;1210,00')
  })

  it('comillas cuando hace falta', () => {
    expect(lineas[3]).toContain('"Taller; ""El Sur"""')
  })

  it('anuladas marcadas y fuera de los totales; simplificadas sin cliente', () => {
    expect(lineas[4]).toContain(';Anulada;')
    expect(lineas[5]).toBe('FS-001;05/10/2026;Simplificada;Pagada;;;50,00;21,00;10,50;60,50')
    expect(lineas[7]).toBe('Totales (3 facturas, sin anuladas);;;;;;1150,00;;220,50;1370,50')
  })

  it('no deja pasar fórmulas de Excel', () => {
    expect(celdaCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(celdaCsv('-50,00')).toBe('-50,00')
    expect(importeCsv(-12.5)).toBe('-12,50')
  })
})
