import { test, expect, request as pwRequest } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { SIN_SESION } from './sin-sesion'

// Rutas de la ficha de orden (api/ordenes/ficha). Antes la ficha escribía en
// Supabase desde el navegador y solo RLS lo protegía; ahora pasa por aquí.

const A = '00000000-0000-4000-a000-00000000a0a1'
const B = '00000000-0000-4000-a000-00000000b0b1'
const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01'
const VEHICULO_A = '00000000-0000-4000-a000-0000000e1a01'
const CLIENTE_B = '00000000-0000-4000-a000-0000000c1b01'

const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const sesionB = (baseURL: string | undefined) => pwRequest.newContext({ baseURL, storageState: 'playwright/.auth/qa-b.json' })
const sinSesion = (baseURL: string | undefined) => pwRequest.newContext({ baseURL, storageState: SIN_SESION })

const ORDEN_BASE = { cliente_id: CLIENTE_A, vehiculo_id: VEHICULO_A, estado: 'recibido', descripcion_problema: 'Ficha API QA' }

test.describe.configure({ mode: 'serial' })

let ordenId = ''

test('crear: número OR- aunque la última orden tenga otro formato; líneas e importes en el servidor', async ({ request }) => {
  // La última orden del taller no es OR-NNNN (antes la nueva salía OR-0001 y chocaba)
  const { error } = await db().from('ordenes_reparacion').insert({ taller_id: A, numero_orden: `QA-OTRO-${Date.now()}`, estado: 'recibido', cliente_id: CLIENTE_A })
  expect(error).toBeNull()

  const r = await request.post('/api/ordenes/ficha', {
    data: {
      orden: { ...ORDEN_BASE, taller_id: B, total_con_iva: 1, token_publico: '00000000-0000-4000-a000-000000000000' },
      lineas: [
        { tipo: 'mano_obra', descripcion: 'MO QA', cantidad: 2, precio_unitario: 40 },
        { tipo: 'suplido', descripcion: 'ITV QA', cantidad: 1, precio_unitario: 50 },
      ],
    },
  })
  expect(r.status(), await r.text()).toBe(201)
  const { orden } = await r.json()
  expect(orden.numero_orden).toMatch(/^OR-\d{4,}$/)
  ordenId = orden.id

  const { data: o } = await db().from('ordenes_reparacion').select('taller_id, token_publico, subtotal_mano_obra, iva_amount, total_con_iva').eq('id', ordenId).single()
  // Taller de la sesión; token e importes no se aceptan del cliente
  expect(o!.taller_id).toBe(A)
  expect(o!.token_publico).not.toBe('00000000-0000-4000-a000-000000000000')
  // 80 € de mano de obra al 21 % + 50 € de suplido sin IVA
  expect(Number(o!.subtotal_mano_obra)).toBe(80)
  expect(Number(o!.iva_amount)).toBe(16.8)
  expect(Number(o!.total_con_iva)).toBe(146.8)
})

test('guardar: IVA 0 deja los importes coherentes al momento (antes quedaban al 21 %)', async ({ request }) => {
  const r = await request.patch('/api/ordenes/ficha', { data: { id: ordenId, orden: { ...ORDEN_BASE, iva_porcentaje: 0, presupuesto_aprobado_por_cliente: true } } })
  expect(r.status(), await r.text()).toBe(200)
  const { data: o } = await db().from('ordenes_reparacion').select('iva_porcentaje, iva_amount, total_con_iva, presupuesto_aprobado_por_cliente').eq('id', ordenId).single()
  expect(o).toMatchObject({ presupuesto_aprobado_por_cliente: true })
  expect(Number(o!.iva_porcentaje)).toBe(0)
  expect(Number(o!.iva_amount)).toBe(0)
  expect(Number(o!.total_con_iva)).toBe(130)
})

test('líneas: añadir, cambiar y borrar recalculan el total de la orden', async ({ request }) => {
  const nueva = await request.post('/api/ordenes/ficha/lineas', { data: { orden_id: ordenId, tipo: 'pieza', descripcion: 'Filtro QA', cantidad: 2, precio_unitario: 10 } })
  expect(nueva.status(), await nueva.text()).toBe(201)
  const { id } = await nueva.json()
  const total = async () => Number((await db().from('ordenes_reparacion').select('total_con_iva').eq('id', ordenId).single()).data!.total_con_iva)
  expect(await total()).toBe(150)

  expect((await request.patch('/api/ordenes/ficha/lineas', { data: { id, precio_unitario: 12.5 } })).status()).toBe(200)
  const { data: l } = await db().from('lineas_orden').select('cantidad, precio_unitario, importe_total').eq('id', id).single()
  expect(l).toMatchObject({ cantidad: 2, precio_unitario: 12.5, importe_total: 25 })
  expect(await total()).toBe(155)

  expect((await request.delete(`/api/ordenes/ficha/lineas?id=${id}`)).status()).toBe(200)
  expect(await total()).toBe(130)
})

test('entradas inválidas: 400', async ({ request }) => {
  const casos = [
    await request.post('/api/ordenes/ficha/lineas', { data: { orden_id: ordenId, tipo: 'regalo', descripcion: 'x', cantidad: 1, precio_unitario: 1 } }),
    await request.post('/api/ordenes/ficha/lineas', { data: { orden_id: ordenId, tipo: 'pieza', descripcion: ' ', cantidad: 1, precio_unitario: 1 } }),
    await request.post('/api/ordenes/ficha/lineas', { data: { orden_id: ordenId, tipo: 'pieza', descripcion: 'x', cantidad: -1, precio_unitario: 1 } }),
    await request.patch('/api/ordenes/ficha', { data: { id: ordenId, orden: { estado: 'inventado' } } }),
    await request.patch('/api/ordenes/ficha', { data: { id: ordenId, orden: { cliente_id: CLIENTE_B } } }),
    // Sin cliente la orden rompe el listado de órdenes entero
    await request.patch('/api/ordenes/ficha', { data: { id: ordenId, orden: { cliente_id: '' } } }),
    await request.post('/api/ordenes/ficha', { data: { orden: { ...ORDEN_BASE, cliente_id: CLIENTE_B } } }),
    await request.post('/api/ordenes/ficha', { data: { orden: { ...ORDEN_BASE, cliente_id: '' } } }),
    await request.post('/api/vehiculos', { data: { matricula: `${Date.now()}QB`, cliente_id: CLIENTE_B } }),
    await request.patch('/api/vehiculos', { data: { id: VEHICULO_A, cliente_id: CLIENTE_B } }),
  ]
  for (const r of casos) expect(r.status(), `${r.url()} ${await r.text()}`).toBe(400)
  const { data: v } = await db().from('vehiculos').select('cliente_id').eq('id', VEHICULO_A).single()
  expect(v!.cliente_id).toBe(CLIENTE_A)
})

test('el taller B no lee ni modifica la orden de A; sin sesión, 401', async ({ baseURL }) => {
  const { data: linea } = await db().from('lineas_orden').select('id').eq('orden_id', ordenId).limit(1).single()
  const b = await sesionB(baseURL)
  const intentos = [
    await b.get(`/api/ordenes/ficha?orden=${ordenId}`),
    await b.patch('/api/ordenes/ficha', { data: { id: ordenId, orden: { notas: 'hackeado por B' } } }),
    await b.post('/api/ordenes/ficha/lineas', { data: { orden_id: ordenId, tipo: 'pieza', descripcion: 'B', cantidad: 1, precio_unitario: 1 } }),
    await b.patch('/api/ordenes/ficha/lineas', { data: { id: linea!.id, precio_unitario: 0 } }),
    await b.delete(`/api/ordenes/ficha/lineas?id=${linea!.id}`),
  ]
  for (const r of intentos) expect(r.status(), r.url()).toBe(404)
  await b.dispose()

  const anon = await sinSesion(baseURL)
  expect((await anon.get(`/api/ordenes/ficha?orden=${ordenId}`)).status()).toBe(401)
  await anon.dispose()

  const { data: o } = await db().from('ordenes_reparacion').select('notas').eq('id', ordenId).single()
  expect(o!.notas).not.toBe('hackeado por B')
  expect((await db().from('lineas_orden').select('id').eq('orden_id', ordenId)).data).toHaveLength(2)
})

test('estado «facturado» a mano se mantiene como hoy y deja la orden bloqueada (409)', async ({ request }) => {
  expect((await request.patch('/api/ordenes/ficha', { data: { id: ordenId, orden: { ...ORDEN_BASE, estado: 'facturado' } } })).status()).toBe(200)
  const { data: linea } = await db().from('lineas_orden').select('id').eq('orden_id', ordenId).limit(1).single()
  const intentos = [
    await request.patch('/api/ordenes/ficha', { data: { id: ordenId, orden: { notas: 'tras facturar' } } }),
    await request.post('/api/ordenes/ficha/lineas', { data: { orden_id: ordenId, tipo: 'pieza', descripcion: 'x', cantidad: 1, precio_unitario: 1 } }),
    await request.patch('/api/ordenes/ficha/lineas', { data: { id: linea!.id, precio_unitario: 0 } }),
    await request.delete(`/api/ordenes/ficha/lineas?id=${linea!.id}`),
  ]
  for (const r of intentos) expect(r.status(), r.url()).toBe(409)
})
