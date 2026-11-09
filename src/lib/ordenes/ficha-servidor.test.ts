import { describe, it, expect } from 'vitest'
import { filtrarCamposFicha, errorLinea, errorImportesLinea, CAMPOS_FICHA } from './ficha-servidor'
import { datosOrdenFicha } from './ficha-datos'

describe('filtrarCamposFicha', () => {
  it('descarta columnas de control e importes; conserva los campos de la ficha', () => {
    const r = filtrarCamposFicha({
      taller_id: 'otro', token_publico: 'x', deleted_at: 'hoy', numero_orden: 'OR-9999',
      total_con_iva: 1, iva_amount: 0, subtotal_piezas: 0, subtotal_mano_obra: 0,
      notas: 'n', iva_porcentaje: 0, presupuesto_aprobado_por_cliente: true,
      observaciones_cliente: 'o', fecha_prevista_entrega: '2026-11-20',
    })
    expect(r).toEqual({ ok: true, datos: {
      notas: 'n', iva_porcentaje: 0, presupuesto_aprobado_por_cliente: true,
      observaciones_cliente: 'o', fecha_prevista_entrega: '2026-11-20',
    } })
  })

  it('ids vacíos pasan a null', () => {
    expect(filtrarCamposFicha({ cliente_id: '', vehiculo_id: '' })).toEqual({ ok: true, datos: { cliente_id: null, vehiculo_id: null } })
  })

  it('estado: los de la lista (también «facturado», como hoy) o el que ya tenía la orden', () => {
    expect(filtrarCamposFicha({ estado: 'facturado' }).ok).toBe(true)
    expect(filtrarCamposFicha({ estado: 'inventado' }).ok).toBe(false)
    expect(filtrarCamposFicha({ estado: 'pendiente' }, 'pendiente').ok).toBe(true)
    expect(filtrarCamposFicha({ estado: 3 }).ok).toBe(false)
  })

  it('IVA entre 0 y 100', () => {
    expect(filtrarCamposFicha({ iva_porcentaje: '10' })).toEqual({ ok: true, datos: { iva_porcentaje: 10 } })
    expect(filtrarCamposFicha({ iva_porcentaje: -1 }).ok).toBe(false)
    expect(filtrarCamposFicha({ iva_porcentaje: 'abc' }).ok).toBe(false)
  })

  it('cuerpo que no es un objeto', () => {
    expect(filtrarCamposFicha(null).ok).toBe(false)
    expect(filtrarCamposFicha([]).ok).toBe(false)
  })

  it('todo lo que envía la ficha es un campo permitido', () => {
    const enviado = Object.keys(datosOrdenFicha({ estado: 'recibido', cliente_id: 'c', vehiculo_id: 'v' }))
    expect(enviado.filter((c) => !CAMPOS_FICHA.includes(c))).toEqual([])
  })
})

describe('líneas', () => {
  const ok = { tipo: 'pieza', descripcion: 'Filtro', cantidad: 2, precio_unitario: 10 }
  it('válida', () => expect(errorLinea(ok)).toBeNull())
  it('tipo, descripción e importes', () => {
    expect(errorLinea({ ...ok, tipo: 'regalo' })).toMatch(/tipo/i)
    expect(errorLinea({ ...ok, descripcion: '  ' })).toMatch(/descripción/)
    expect(errorLinea({ ...ok, cantidad: -1 })).toMatch(/cantidad/)
    expect(errorLinea({ ...ok, precio_unitario: '10' })).toMatch(/precio/)
    expect(errorLinea({ ...ok, precio_unitario: Infinity })).toMatch(/precio/)
    expect(errorLinea(null)).toBeTruthy()
  })
  it('al editar solo se validan los importes que vienen', () => {
    expect(errorImportesLinea({ precio_unitario: 0 })).toBeNull()
    expect(errorImportesLinea({})).toBeNull()
  })
})

describe('datosOrdenFicha', () => {
  it('vacíos a null; IVA y acción por defecto; sin importes', () => {
    const d = datosOrdenFicha({ estado: 'recibido', cliente_id: '', vehiculo_id: '', danos_carroceria: '', kilometros_entrada: 0 })
    expect(d).toMatchObject({
      cliente_id: null, vehiculo_id: null, danos_carroceria: null, kilometros_entrada: null,
      accion_imprevisto: 'avisar', iva_porcentaje: 21, observaciones_cliente: null,
    })
    expect(d).not.toHaveProperty('total_con_iva')
    expect(datosOrdenFicha({ estado: 'recibido', cliente_id: 'c', vehiculo_id: 'v', iva_porcentaje: 0 }).iva_porcentaje).toBe(0)
  })
})
