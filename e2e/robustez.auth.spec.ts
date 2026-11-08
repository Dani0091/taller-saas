import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { SIN_SESION } from './sin-sesion'

// Tests adversariales: intentan romper el aislamiento entre talleres, colar
// datos que el servidor no debería aceptar y provocar carreras. Cada ataque
// comprueba la respuesta HTTP y, sobre todo, el estado real de la base local.

const A = '00000000-0000-4000-a000-00000000a0a1'
const B = '00000000-0000-4000-a000-00000000b0b1'
const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01'
const VEHICULO_A = '00000000-0000-4000-a000-0000000e1a01'
const CLIENTE_B = '00000000-0000-4000-a000-0000000c1b01'
const VEHICULO_B = '00000000-0000-4000-a000-0000000e1b01'


const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })

let seq = 0
async function ordenA(request: APIRequestContext, extra: Record<string, unknown> = {}) {
  seq += 1
  const r = await request.post('/api/ordenes', {
    data: { numero_orden: `QA-ROB-${Date.now()}-${seq}`, cliente_id: CLIENTE_A, vehiculo_id: VEHICULO_A, estado: 'pendiente', ...extra },
  })
  return { r, body: await r.json() }
}

async function linea(ordenId: string) {
  const { error } = await db().from('lineas_orden').insert({
    orden_id: ordenId, tipo: 'mano_obra', descripcion: 'QA', cantidad: 1, precio_unitario: 40, iva_porcentaje: 21,
  })
  expect(error).toBeNull()
}

async function sesionB(baseURL: string | undefined) {
  return pwRequest.newContext({ baseURL, storageState: 'playwright/.auth/qa-b.json' })
}

test.describe('Asignación masiva en POST /api/ordenes', () => {
  test('no acepta campos de control enviados por el cliente', async ({ request }) => {
    const tokenElegido = '11111111-1111-4111-8111-111111111111'
    const { r, body } = await ordenA(request, {
      token_publico: tokenElegido,
      fecha_aceptacion_cliente: '2020-01-01T00:00:00Z',
      presupuesto_aprobado_por_cliente: true,
      deleted_at: '2020-01-01T00:00:00Z',
      numero_visual: 999999,
      taller_id: B,
    })
    if (r.status() >= 400) return // rechazar también es correcto
    const { data } = await db().from('ordenes_reparacion')
      .select('taller_id, token_publico, fecha_aceptacion_cliente, presupuesto_aprobado_por_cliente, deleted_at')
      .eq('id', body.orden.id).single()
    expect(data!.taller_id).toBe(A)
    expect(data!.token_publico).not.toBe(tokenElegido)
    expect(data!.fecha_aceptacion_cliente).toBeNull()
    expect(data!.presupuesto_aprobado_por_cliente).not.toBe(true)
    expect(data!.deleted_at).toBeNull()
  })

  test('no permite crear una orden ya "facturado" sin factura', async ({ request }) => {
    const { r, body } = await ordenA(request, { estado: 'facturado' })
    if (r.status() >= 400) return
    const { data } = await db().from('ordenes_reparacion').select('estado').eq('id', body.orden.id).single()
    expect(data!.estado).not.toBe('facturado')
  })

  test('no permite vincular cliente o vehículo de otro taller', async ({ request }) => {
    const { r, body } = await ordenA(request, { cliente_id: CLIENTE_B, vehiculo_id: VEHICULO_B })
    if (r.status() >= 400) return
    const { data } = await db().from('ordenes_reparacion').select('cliente_id, vehiculo_id').eq('id', body.orden.id).single()
    expect(data!.cliente_id).not.toBe(CLIENTE_B)
    expect(data!.vehiculo_id).not.toBe(VEHICULO_B)
  })
})

test.describe('PATCH /api/ordenes', () => {
  test('no permite vincular cliente/vehículo de otro taller', async ({ request }) => {
    const { body } = await ordenA(request)
    const r = await request.patch('/api/ordenes', { data: { id: body.orden.id, cliente_id: CLIENTE_B, vehiculo_id: VEHICULO_B } })
    const { data } = await db().from('ordenes_reparacion').select('cliente_id, vehiculo_id').eq('id', body.orden.id).single()
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(data!.cliente_id).toBe(CLIENTE_A)
    expect(data!.vehiculo_id).toBe(VEHICULO_A)
  })

  test('no permite marcar "facturado" a mano (solo emitiendo factura)', async ({ request }) => {
    const { body } = await ordenA(request)
    const r = await request.patch('/api/ordenes', { data: { id: body.orden.id, estado: 'facturado' } })
    const { data } = await db().from('ordenes_reparacion').select('estado').eq('id', body.orden.id).single()
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(data!.estado).not.toBe('facturado')
  })

  test('id inexistente o malformado: 4xx, nunca 500', async ({ request }) => {
    for (const id of ['00000000-0000-4000-a000-000000000000', 'no-es-un-uuid', "'; drop table x; --", '']) {
      const r = await request.patch('/api/ordenes', { data: { id, notas: 'x' } })
      expect(r.status(), `id=${JSON.stringify(id)}`).toBeGreaterThanOrEqual(400)
      expect(r.status(), `id=${JSON.stringify(id)}`).toBeLessThan(500)
    }
  })
})

test.describe('Aislamiento: el taller B ataca recursos del taller A', () => {
  let ordenId = ''
  let facturaId = ''

  test.beforeAll(async ({ request }) => {
    const { body } = await ordenA(request, { estado: 'aprobado' })
    ordenId = body.orden.id
    await linea(ordenId)
    const f = await request.post('/api/facturas/crear', {
      data: { taller_id: A, cliente_id: CLIENTE_A, serie: 'QA', base_imponible: 10, iva: 2.1, total: 12.1, lineas: [] },
    })
    const fb = await f.json()
    facturaId = fb.factura?.id ?? fb.id ?? fb.data?.id
    expect(facturaId).toBeTruthy()
  })

  test('B no puede leer, modificar, compartir, cobrar ni emitir lo de A', async ({ baseURL }) => {
    const b = await sesionB(baseURL)
    const intentos = [
      await b.get(`/api/facturas/detalles?id=${facturaId}`),
      await b.patch('/api/ordenes', { data: { id: ordenId, notas: 'hackeado por B' } }),
      await b.post('/api/ordenes/compartir', { data: { orden_id: ordenId } }),
      await b.post('/api/facturas/cobro-rapido', { data: { orden_id: ordenId, serie: 'QB' } }),
      await b.post('/api/facturas/emitir', { data: { factura_id: facturaId, estado_final: 'emitida' } }),
    ]
    for (const r of intentos) expect(r.status(), r.url()).toBeGreaterThanOrEqual(400)

    const { data: o } = await db().from('ordenes_reparacion').select('notas, estado, fecha_envio_presupuesto').eq('id', ordenId).single()
    expect(o!.notas).not.toBe('hackeado por B')
    expect(o!.estado).toBe('aprobado')
    expect(o!.fecha_envio_presupuesto).toBeNull()
    const { data: f } = await db().from('facturas').select('estado, numero_factura').eq('id', facturaId).single()
    expect(f!.estado).toBe('borrador')
    expect(f!.numero_factura).toBeNull()
    await b.dispose()
  })

  test('B no ve clientes de A ni con el parámetro taller_id', async ({ baseURL }) => {
    const b = await sesionB(baseURL)
    const ids = ((await (await b.get(`/api/clientes?taller_id=${A}`)).json()) as Array<{ id: string }>).map((c) => c.id)
    expect(ids).not.toContain(CLIENTE_A)
    await b.dispose()
  })
})

test.describe('Carreras', () => {
  test('cobro rápido simultáneo sobre la misma orden: una sola factura y un solo número', async ({ request }) => {
    const { body } = await ordenA(request, { estado: 'aprobado' })
    await linea(body.orden.id)
    const rs = await Promise.all(
      Array.from({ length: 4 }, () => request.post('/api/facturas/cobro-rapido', { data: { orden_id: body.orden.id, serie: 'QA' } }))
    )
    const ok = rs.filter((r) => r.status() === 200)
    expect(ok.length).toBeGreaterThanOrEqual(1)
    const { data } = await db().from('facturas').select('id, numero_factura').eq('orden_id', body.orden.id)
    expect(data!.length).toBe(1)
    expect(data![0].numero_factura).toMatch(/^QA-\d{3,}$/)
  })

  test('factura desde orden simultánea: un solo borrador para la orden', async ({ request }) => {
    const { body } = await ordenA(request, { estado: 'aprobado' })
    await linea(body.orden.id)
    const rs = await Promise.all(
      Array.from({ length: 4 }, () => request.post('/api/facturas/desde-orden', { data: { orden_id: body.orden.id, serie: 'QA' } }))
    )
    for (const r of rs) expect(r.status()).toBeLessThan(500)
    const { data } = await db().from('facturas').select('id').eq('orden_id', body.orden.id)
    expect(data!.length).toBe(1)
  })

  test('emisiones simultáneas de facturas distintas: números únicos y consecutivos', async ({ request }) => {
    const ids: string[] = []
    for (let i = 0; i < 5; i++) {
      const f = await request.post('/api/facturas/crear', {
        data: { taller_id: A, cliente_id: CLIENTE_A, serie: 'QA', base_imponible: 1, iva: 0.21, total: 1.21, lineas: [] },
      })
      const b = await f.json()
      ids.push(b.factura?.id ?? b.id ?? b.data?.id)
    }
    const rs = await Promise.all(ids.map((id) => request.post('/api/facturas/emitir', { data: { factura_id: id, estado_final: 'emitida' } })))
    const numeros = await Promise.all(rs.map(async (r) => { expect(r.status()).toBe(200); return (await r.json()).numero_factura as string }))
    expect(new Set(numeros).size).toBe(5)
    const ns = numeros.map((n) => Number(n.split('-')[1])).sort((x, y) => x - y)
    expect(ns[4] - ns[0]).toBe(4)
  })
})

test.describe('Entradas inválidas: 4xx controlado, nunca 500', () => {
  test('emitir con factura_id malformado o sin estado_final', async ({ request }) => {
    for (const data of [{ factura_id: 'x', estado_final: 'emitida' }, { factura_id: '', estado_final: 'emitida' }, { estado_final: 'emitida' }, { factura_id: CLIENTE_A }]) {
      const r = await request.post('/api/facturas/emitir', { data })
      expect(r.status(), JSON.stringify(data)).toBeGreaterThanOrEqual(400)
      expect(r.status(), JSON.stringify(data)).toBeLessThan(500)
    }
  })

  test('cuerpo que no es JSON', async ({ request }) => {
    for (const ruta of ['/api/facturas/emitir', '/api/facturas/cobro-rapido', '/api/ordenes', '/api/ordenes/compartir']) {
      const r = await request.post(ruta, { headers: { 'Content-Type': 'application/json' }, data: '{no es json' })
      expect(r.status(), ruta).toBeGreaterThanOrEqual(400)
      expect(r.status(), ruta).toBeLessThan(500)
    }
  })

  test('token de presupuesto manipulado', async ({ baseURL }) => {
    const p = await pwRequest.newContext({ baseURL, storageState: SIN_SESION })
    for (const t of ['null', 'undefined', '..%2F..%2Fapi%2Fclientes', 'x'.repeat(5000), "' OR '1'='1"]) {
      const r = await p.get(`/api/presupuesto/${t}`)
      expect(r.status(), t.slice(0, 30)).toBeGreaterThanOrEqual(400)
      expect(r.status(), t.slice(0, 30)).toBeLessThan(500)
    }
    await p.dispose()
  })

  test('crear factura con importes absurdos no produce una factura aceptada', async ({ request }) => {
    for (const data of [
      { base_imponible: -100, iva: -21, total: -121 },
      { base_imponible: 'cien', iva: 'x', total: 'y' },
      { base_imponible: 1e308, iva: 1e308, total: Infinity },
    ]) {
      const r = await request.post('/api/facturas/crear', { data: { taller_id: A, cliente_id: CLIENTE_A, serie: 'QA', lineas: [], ...data } })
      expect(r.status(), JSON.stringify(data)).toBeLessThan(500)
      if (r.status() < 300) {
        const b = await r.json()
        const id = b.factura?.id ?? b.id ?? b.data?.id
        const { data: f } = await db().from('facturas').select('total, base_imponible').eq('id', id).single()
        expect(Number(f!.total), JSON.stringify(data)).toBeGreaterThanOrEqual(0)
        expect(Number.isFinite(Number(f!.total)), JSON.stringify(data)).toBe(true)
      }
    }
  })
})

test.describe('Configuración y series: siempre el taller de la sesión', () => {
  test('sin sesión no se puede leer la configuración de un taller', async ({ baseURL }) => {
    const anonimo = await pwRequest.newContext({ baseURL, storageState: SIN_SESION })
    const r = await anonimo.get(`/api/taller/config/obtener?taller_id=${A}`)
    expect(r.status()).toBe(401)
    expect(await r.text()).not.toContain(A)
    expect((await anonimo.get(`/api/series/obtener?taller_id=${A}`)).status()).toBe(401)
    expect((await anonimo.post('/api/series/crear', { data: { taller_id: A, nombre: 'X', prefijo: 'ANON' } })).status()).toBe(401)
    await anonimo.dispose()
  })

  test('A sigue leyendo su configuración y sus series (uso legítimo)', async ({ request }) => {
    const cfg = await request.get('/api/taller/config/obtener')
    expect(cfg.status()).toBe(200)
    expect((await cfg.json()).taller_id).toBe(A)
    const series = await request.get(`/api/series/obtener?taller_id=${A}`)
    expect(series.status()).toBe(200)
  })

  test('B crea la serie en su propio taller aunque pida el de A', async ({ baseURL }) => {
    const b = await sesionB(baseURL)
    const prefijo = 'ZB' + String(Date.now()).slice(-3)
    const r = await b.post('/api/series/crear', { data: { taller_id: A, nombre: 'Propia', prefijo, ultimo_numero: 0 } })
    expect(r.status(), await r.text()).toBeLessThan(300)
    const { data } = await db().from('series_factura').select('taller_id').eq('prefijo', prefijo)
    expect(data?.map((s) => s.taller_id)).toEqual([B])
    await db().from('series_factura').delete().eq('prefijo', prefijo)
    await b.dispose()
  })

  test('crear serie con JSON roto o sin campos da 400, no 500', async ({ request }) => {
    const roto = await request.post('/api/series/crear', { data: '{no es json', headers: { 'content-type': 'application/json' } })
    expect(roto.status()).toBe(400)
    expect((await request.post('/api/series/crear', { data: { nombre: 'Sin prefijo' } })).status()).toBe(400)
  })

  test('B no lee la configuración ni las series de A pidiendo su taller_id', async ({ baseURL }) => {
    await db().from('taller_config').update({ nombre_empresa: 'Config secreta de A' }).eq('taller_id', A)
    const b = await sesionB(baseURL)
    const cfg = await (await b.get(`/api/taller/config/obtener?taller_id=${A}`)).text()
    expect(cfg).not.toContain('Config secreta de A')
    const series = await (await b.get(`/api/series/obtener?taller_id=${A}`)).text()
    expect(series).not.toContain('"QAF"')
    await b.dispose()
  })

  test('B no puede crear una serie en el taller de A', async ({ baseURL }) => {
    const b = await sesionB(baseURL)
    const prefijo = 'ZZ' + String(Date.now()).slice(-3)
    await b.post('/api/series/crear', { data: { taller_id: A, nombre: 'Intrusa', prefijo, ultimo_numero: 0 } })
    const { data } = await db().from('series_factura').select('taller_id').eq('prefijo', prefijo)
    expect((data ?? []).filter((s) => s.taller_id === A)).toHaveLength(0)
    await b.dispose()
  })
})
