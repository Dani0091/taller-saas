import { describe, it, expect } from 'vitest'
import { mensajePresupuesto, mensajeOrden } from './mensajes-whatsapp'

describe('mensajePresupuesto', () => {
  it('con nombre y taller', () => {
    expect(mensajePresupuesto({ nombreCliente: 'Ana', enlace: 'https://x/p/1', nombreTaller: 'Taller QA' })).toBe(
      'Hola Ana, te enviamos el presupuesto de tu vehículo de Taller QA.\n\n📋 Ver presupuesto: https://x/p/1\n\nPuedes aceptarlo directamente desde el enlace.'
    )
  })

  it.each([undefined, null, '', '   '])('sin nombre (%s) no deja "Hola ,"', (nombreCliente) => {
    const m = mensajePresupuesto({ nombreCliente, enlace: 'https://x/p/1' })
    expect(m.startsWith('Hola, te enviamos el presupuesto de tu vehículo.')).toBe(true)
    expect(m).not.toMatch(/undefined|null| ,/)
  })
})

describe('mensajeOrden', () => {
  const completa = {
    taller: { nombre: 'Taller QA', telefono: '910000000' },
    orden: { numero: 'OR-0007', estado: 'en_progreso', descripcionProblema: 'Ruido al frenar' },
    cliente: { nombre: 'Ana', apellidos: 'Gil' },
    vehiculo: { marca: 'Seat', modelo: 'Ibiza', matricula: '0000QAA', kilometros: 123456 },
    totales: { total: 1234.5 },
  }

  it('orden completa: estado legible e importes en formato español', () => {
    const m = mensajeOrden(completa)
    expect(m).toContain('📋 *ORDEN DE TRABAJO OR-0007*')
    expect(m).toContain('👤 Cliente: Ana Gil')
    expect(m).toContain('🚗 Vehículo: Seat Ibiza')
    expect(m).toContain('Km: 123.456')
    // Formato español: sin separador de miles con 4 cifras (como formatCurrency en toda la app)
    expect(m).toContain('💰 Total estimado: 1.234,50\u00a0€')
    expect(mensajeOrden({ ...completa, totales: { total: 12345.5 } })).toContain('12.345,50\u00a0€')
    expect(m).toContain('Estado: En reparación')
    expect(m).not.toContain('EN_PROGRESO')
  })

  it('con casi todo vacío no hay "undefined", "null", "N/A" ni líneas huecas', () => {
    const m = mensajeOrden({
      taller: { nombre: null, telefono: undefined },
      orden: { numero: null, estado: null, descripcionProblema: '' },
      cliente: { nombre: '  ', apellidos: null },
      vehiculo: { marca: null, modelo: undefined, matricula: '', kilometros: null },
      totales: { total: null },
    })
    expect(m).toBe('📋 *ORDEN DE TRABAJO*')
  })

  it('cero kilómetros y total 0 sí se muestran (no son "vacío")', () => {
    const m = mensajeOrden({ ...completa, vehiculo: { ...completa.vehiculo, kilometros: 0 }, totales: { total: 0 } })
    expect(m).toContain('Km: 0')
    expect(m).toContain('Total estimado: 0,00\u00a0€')
  })

  it('estado desconocido se muestra tal cual', () => {
    expect(mensajeOrden({ ...completa, orden: { ...completa.orden, estado: 'raro' } })).toContain('Estado: raro')
  })

  it('solo apellidos: sin espacio inicial', () => {
    expect(mensajeOrden({ ...completa, cliente: { nombre: null, apellidos: 'Gil' } })).toContain('👤 Cliente: Gil\n')
  })
})
